import boto3
import urllib.parse
import os

print('Loading function')

rekognition = boto3.client('rekognition')
dynamodb = boto3.client('dynamodb')
s3 = boto3.client('s3')

# Fetch environment variables
COLLECTION_ID = os.environ.get('COLLECTION_ID', 'criminal_collection')
TABLE_NAME = os.environ.get('TABLE_NAME', 'criminal_records')

def lambda_handler(event, context):
    # 1. Get the bucket and file name from the S3 event
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')
    
    try:
        # 2. Fetch custom metadata (Name, Crime, Status) from the S3 object
        response_s3 = s3.head_object(Bucket=bucket, Key=key)
        metadata = response_s3.get('Metadata', {})
        
        fullname = metadata.get('fullname', 'Unknown')
        crime = metadata.get('crime', 'Unspecified')
        status = metadata.get('status', 'Unknown')

        # 3. Send image to Rekognition to extract facial biometrics
        response_rek = rekognition.index_faces(
            CollectionId=COLLECTION_ID,
            Image={'S3Object': {'Bucket': bucket, 'Name': key}},
            ExternalImageId=fullname.replace(" ", "_"), # AWS requires no spaces here
            MaxFaces=1,
            QualityFilter="AUTO",
            DetectionAttributes=['ALL']
        )
        
        # 4. Save the biometric FaceId and metadata to DynamoDB
        for faceRecord in response_rek['FaceRecords']:
            face_id = faceRecord['Face']['FaceId']
            
            dynamodb.put_item(
                TableName=TABLE_NAME,
                Item={
                    'RekognitionId': {'S': face_id},
                    'FullName': {'S': fullname},
                    'CrimeType': {'S': crime},
                    'WantedStatus': {'S': status},
                    'S3Key': {'S': key}
                }
            )
            print(f"✅ Indexed {fullname} with FaceId {face_id}")
            
        return {"statusCode": 200, "body": "Success"}
        
    except Exception as e:
        print(f"⚠️ Error processing object {key} from bucket {bucket}.")
        print(e)
        raise e