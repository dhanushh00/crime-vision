import boto3
import os
from botocore.exceptions import ClientError
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
# CHANGE THIS to something unique, like "crimevision-images-sumathi-2026"
BUCKET_NAME = "crimevision-mugshots-bucket-unique" 
TABLE_NAME = "criminal_records"
COLLECTION_ID = "criminal_collection"

# Initialize Boto3 clients
s3_client = boto3.client('s3', region_name=AWS_REGION)
dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
rekognition = boto3.client('rekognition', region_name=AWS_REGION)

def create_s3_bucket():
    try:
        print(f"Creating S3 Bucket: {BUCKET_NAME}...")
        if AWS_REGION == "us-east-1":
            s3_client.create_bucket(Bucket=BUCKET_NAME)
        else:
            s3_client.create_bucket(
                Bucket=BUCKET_NAME,
                CreateBucketConfiguration={'LocationConstraint': AWS_REGION}
            )
        print("✅ S3 Bucket created successfully.")
    except ClientError as e:
        print(f"⚠️ S3 Error: {e.response['Error']['Message']}")

def create_dynamodb_table():
    try:
        print(f"Creating DynamoDB Table: {TABLE_NAME}...")
        table = dynamodb.create_table(
            TableName=TABLE_NAME,
            KeySchema=[{'AttributeName': 'RekognitionId', 'KeyType': 'HASH'}],
            AttributeDefinitions=[{'AttributeName': 'RekognitionId', 'AttributeType': 'S'}],
            BillingMode='PAY_PER_REQUEST' # Serverless, cheaper billing
        )
        table.wait_until_exists()
        print("✅ DynamoDB Table created successfully.")
    except ClientError as e:
        print(f"⚠️ DynamoDB Error: {e.response['Error']['Message']}")

def create_rekognition_collection():
    try:
        print(f"Creating Rekognition Collection: {COLLECTION_ID}...")
        rekognition.create_collection(CollectionId=COLLECTION_ID)
        print("✅ Rekognition Collection created successfully.")
    except ClientError as e:
        print(f"⚠️ Rekognition Error: {e.response['Error']['Message']}")

if __name__ == "__main__":
    print("🚀 Starting AWS Infrastructure Provisioning...")
    create_s3_bucket()
    create_dynamodb_table()
    create_rekognition_collection()
    print("🎉 Infrastructure setup complete!")