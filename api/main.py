import os
import boto3
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load local AWS credentials from .env
load_dotenv()

app = FastAPI(title="CrimeVision API")

# Allow our Next.js frontend (running on port 3000) to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
BUCKET_NAME = "crimevision-mugshots-bucket-unique" # UPDATE THIS to your bucket name
TABLE_NAME = "criminal_records"
COLLECTION_ID = "criminal_collection"

# Initialize Boto3 Clients
rekognition = boto3.client('rekognition', region_name=AWS_REGION)
dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
s3_client = boto3.client('s3', region_name=AWS_REGION)
table = dynamodb.Table(TABLE_NAME)

@app.post("/api/recognize")
async def recognize_face(file: UploadFile = File(...)):
    """Receives a webcam snapshot and searches AWS Rekognition."""
    image_bytes = await file.read()
    
    try:
        # 1. Search the Rekognition Collection
        response = rekognition.search_faces_by_image(
            CollectionId=COLLECTION_ID,
            Image={'Bytes': image_bytes},
            MaxFaces=1,
            FaceMatchThreshold=80.0 # 80% confidence threshold
        )
        
        if not response.get('FaceMatches'):
            return {"match": False, "message": "No match found in the database."}
            
        match = response['FaceMatches'][0]
        face_id = match['Face']['FaceId']
        confidence = match['Similarity']
        bounding_box = match['Face']['BoundingBox']
        
        # 2. Fetch the criminal's metadata from DynamoDB using the FaceId
        db_response = table.get_item(Key={'RekognitionId': face_id})
        
        if 'Item' in db_response:
            return {
                "match": True,
                "confidence": round(confidence, 2),
                "bounding_box": bounding_box,
                "criminal_data": db_response['Item']
            }
        else:
            return {"match": True, "message": "Face matched, but metadata is missing."}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/register")
async def register_criminal(
    fullname: str = Form(...),
    crime: str = Form(...),
    status: str = Form(...),
    file: UploadFile = File(...)
):
    """Uploads a new mugshot to S3, triggering the Lambda function."""
    file_extension = file.filename.split(".")[-1]
    safe_name = fullname.replace(" ", "_").lower()
    s3_key = f"criminals/{safe_name}.{file_extension}"
    
    try:
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=await file.read(),
            Metadata={
                'fullname': fullname,
                'crime': crime,
                'status': status
            }
        )
        return {"status": "success", "message": f"Successfully uploaded {fullname}. AWS Lambda is indexing it now!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))