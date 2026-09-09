import os
import io
import json
import uuid
from datetime import datetime, timezone
import boto3
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load local AWS credentials from .env
load_dotenv()

app = FastAPI(title="CrimeVision API")

# Allow Next.js frontend to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "crimevision-mugshots-bucket-unique")
TABLE_NAME = os.getenv("DYNAMODB_TABLE", "criminal_records")
COLLECTION_ID = os.getenv("REKOGNITION_COLLECTION", "criminal_collection")

# Initialize Boto3 Clients
rekognition = boto3.client('rekognition', region_name=AWS_REGION)
dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
s3_client = boto3.client('s3', region_name=AWS_REGION)
table = dynamodb.Table(TABLE_NAME)

AUDIT_LOG_FILE = os.path.join(os.path.dirname(__file__), "audit_logs.json")

def load_audit_logs():
    if os.path.exists(AUDIT_LOG_FILE):
        try:
            with open(AUDIT_LOG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def record_audit_log(entry: dict):
    logs = load_audit_logs()
    logs.insert(0, entry) # Most recent first
    # Keep last 500 records
    logs = logs[:500]
    try:
        with open(AUDIT_LOG_FILE, "w", encoding="utf-8") as f:
            json.dump(logs, f, indent=2)
    except Exception as e:
        print(f"Error saving audit log: {e}")

def generate_presigned_url(s3_key: str, expires_in: int = 3600) -> str:
    """Generates a secure temporary presigned URL to view mugshots directly from S3."""
    if not s3_key:
        return ""
    try:
        return s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': s3_key},
            ExpiresIn=expires_in
        )
    except Exception as e:
        print(f"Presigned URL generation error: {e}")
        return ""

def normalize_image_to_jpeg(raw_bytes: bytes) -> bytes:
    """
    Converts any uploaded image (WEBP, AVIF, PNG, GIF, BMP, etc.)
    to a standard RGB JPEG, preventing Rekognition InvalidImageFormatException.
    """
    try:
        img = Image.open(io.BytesIO(raw_bytes))
        original_format = img.format
        print(f"[normalize] Detected format: {original_format}, mode: {img.mode}, size: {img.size}")

        if img.mode in ('RGBA', 'LA', 'P'):
            # Composite transparency onto white background before JPEG conversion
            bg = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            bg.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
            img = bg
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=95)
        jpeg_bytes = buf.getvalue()
        print(f"[normalize] Converted to JPEG successfully, output size: {len(jpeg_bytes)} bytes")
        return jpeg_bytes
    except Exception as e:
        import traceback
        print(f"[normalize] ERROR during image normalization: {e}")
        traceback.print_exc()
        # Return raw bytes as fallback — Rekognition will give a clearer error
        return raw_bytes

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "CrimeVision API", "region": AWS_REGION}

@app.post("/api/recognize")
async def recognize_face(file: UploadFile = File(...)):
    """Receives a webcam snapshot / image and searches AWS Rekognition collection."""
    raw_bytes = await file.read()
    image_bytes = normalize_image_to_jpeg(raw_bytes)
    
    try:
        # 1. Search the Rekognition Collection
        response = rekognition.search_faces_by_image(
            CollectionId=COLLECTION_ID,
            Image={'Bytes': image_bytes},
            MaxFaces=1,
            FaceMatchThreshold=80.0
        )
        
        if not response.get('FaceMatches'):
            # Record audit log for unidentified scan
            record_audit_log({
                "id": str(uuid.uuid4())[:8],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "match": False,
                "fullname": "Unidentified Individual",
                "crime": "None",
                "status": "CLEAR / NO MATCH",
                "confidence": 0,
                "mugshot_url": ""
            })
            return {"match": False, "message": "No match found in the database."}
            
        match = response['FaceMatches'][0]
        face_id = match['Face']['FaceId']
        confidence = round(match['Similarity'], 2)
        bounding_box = match['Face']['BoundingBox']
        
        # 2. Fetch the criminal's metadata from DynamoDB using the FaceId
        db_response = table.get_item(Key={'RekognitionId': face_id})
        
        if 'Item' in db_response:
            item = db_response['Item']
            s3_key = item.get('S3Key', '')
            mugshot_url = generate_presigned_url(s3_key)
            
            # Record audit log for confirmed match
            record_audit_log({
                "id": str(uuid.uuid4())[:8],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "match": True,
                "fullname": item.get('FullName', 'Unknown'),
                "crime": item.get('CrimeType', 'Unspecified'),
                "status": item.get('WantedStatus', 'UNKNOWN'),
                "confidence": confidence,
                "mugshot_url": mugshot_url,
                "face_id": face_id
            })

            return {
                "match": True,
                "confidence": confidence,
                "bounding_box": bounding_box,
                "criminal_data": item,
                "mugshot_url": mugshot_url
            }
        else:
            return {"match": True, "confidence": confidence, "message": "Face matched, but profile metadata is missing."}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/register")
async def register_criminal(
    fullname: str = Form(...),
    crime: str = Form(...),
    status: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Uploads a new mugshot to S3 and performs direct indexing into AWS Rekognition & DynamoDB.
    Normalizes any image format into JPEG to guarantee Rekognition compatibility.
    """
    raw_bytes = await file.read()
    print(f"[register] Received file: {file.filename}, content_type: {file.content_type}, raw size: {len(raw_bytes)} bytes")
    image_bytes = normalize_image_to_jpeg(raw_bytes)
    safe_name = fullname.replace(" ", "_").lower()
    s3_key = f"criminals/{safe_name}.jpg"
    
    try:
        # 1. Upload to S3 with metadata
        print(f"[register] Uploading to S3: bucket={BUCKET_NAME}, key={s3_key}")
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=image_bytes,
            ContentType='image/jpeg',
            Metadata={
                'fullname': fullname,
                'crime': crime,
                'status': status
            }
        )
        print("[register] S3 upload successful.")
        
        # 2. Direct Indexing in Rekognition (Instant biometric extraction)
        external_id = safe_name.replace("-", "_")[:60]
        print(f"[register] Indexing face in Rekognition: collection={COLLECTION_ID}, external_id={external_id}")
        rek_response = rekognition.index_faces(
            CollectionId=COLLECTION_ID,
            Image={'Bytes': image_bytes},
            ExternalImageId=external_id,
            MaxFaces=1,
            QualityFilter="AUTO"
        )
        
        face_records = rek_response.get('FaceRecords', [])
        print(f"[register] Rekognition indexed {len(face_records)} face(s).")
        if not face_records:
            raise HTTPException(
                status_code=400,
                detail="AWS Rekognition could not detect a clear face in this image. Please upload a clear front-facing portrait."
            )

        face_id = face_records[0]['Face']['FaceId']
        print(f"[register] Face ID: {face_id}")
        
        # 3. Store record in DynamoDB
        table.put_item(
            Item={
                'RekognitionId': face_id,
                'FullName': fullname,
                'CrimeType': crime,
                'WantedStatus': status,
                'S3Key': s3_key,
                'CreatedAt': datetime.now(timezone.utc).isoformat()
            }
        )
        print("[register] DynamoDB record saved successfully.")

        mugshot_url = generate_presigned_url(s3_key)

        return {
            "status": "success",
            "message": f"Successfully indexed {fullname} into CrimeVision cloud!",
            "face_id": face_id,
            "mugshot_url": mugshot_url
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[register] FATAL ERROR: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/audit-logs")
def get_audit_logs():
    """Returns all past surveillance scan audit events."""
    return {"logs": load_audit_logs()}

@app.get("/api/suspects")
def list_suspects():
    """Returns all registered criminal records from DynamoDB with presigned mugshot URLs."""
    try:
        response = table.scan()
        items = response.get('Items', [])
        for item in items:
            item['MugshotUrl'] = generate_presigned_url(item.get('S3Key', ''))
        return {"suspects": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/suspects/{rekognition_id}")
def delete_suspect(rekognition_id: str):
    """
    Deletes a suspect across all 3 cloud layers:
    1. DynamoDB: Removes the metadata record.
    2. Rekognition: Removes the facial vector from the collection.
    3. S3: Deletes the mugshot image object.
    """
    try:
        # 1. Fetch item to get S3Key and Name
        res = table.get_item(Key={'RekognitionId': rekognition_id})
        item = res.get('Item')
        
        s3_key = item.get('S3Key') if item else None
        fullname = item.get('FullName', 'Suspect') if item else 'Suspect'
        
        # 2. Delete from DynamoDB
        table.delete_item(Key={'RekognitionId': rekognition_id})
        
        # 3. Delete facial vector from Rekognition
        try:
            rekognition.delete_faces(
                CollectionId=COLLECTION_ID,
                FaceIds=[rekognition_id]
            )
        except Exception as e:
            print(f"Notice: Rekognition vector delete warning: {e}")
            
        # 4. Delete mugshot photo from S3
        if s3_key:
            try:
                s3_client.delete_object(Bucket=BUCKET_NAME, Key=s3_key)
            except Exception as e:
                print(f"Notice: S3 image delete warning: {e}")
                
        return {
            "status": "success",
            "message": f"Successfully deleted {fullname} from DynamoDB, Rekognition, and S3."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/audit-logs")
def clear_audit_logs():
    """Clears the surveillance scan audit logs."""
    try:
        with open(AUDIT_LOG_FILE, "w", encoding="utf-8") as f:
            json.dump([], f)
        return {"status": "success", "message": "Audit logs cleared."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))