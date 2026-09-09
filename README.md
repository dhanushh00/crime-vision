# 🚨 CrimeVision — Intelligent Cloud-Based Criminal Identification System

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![AWS Rekognition](https://img.shields.io/badge/AWS-Rekognition-232F3E?logo=amazon-aws)](https://aws.amazon.com/rekognition/)
[![AWS S3](https://img.shields.io/badge/AWS-S3-569A31?logo=amazon-s3)](https://aws.amazon.com/s3/)
[![AWS DynamoDB](https://img.shields.io/badge/AWS-DynamoDB-4053D6?logo=amazon-dynamodb)](https://aws.amazon.com/dynamodb/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)

**CrimeVision** is an enterprise-grade biometric surveillance and criminal identification platform built on **Amazon Web Services (AWS)**, **FastAPI**, and **Next.js**. It enables law enforcement and security teams to index suspect records in the cloud, perform real-time biometric scanning via webcam or image upload, visualize facial bounding boxes, and instantly surface criminal profiles with side-by-side mugshot verification.

---

## 🌟 Key Features

* **📷 Dual-Mode Biometric Scanner**: Real-time live webcam snapshot capture and high-resolution photo file upload.
* **🎯 Precision Bounding Box Visualizer**: Overlays dynamic bounding boxes and confidence badges directly onto detected faces using normalized Rekognition coordinates.
* **🖼️ Side-by-Side Mugshot Verification**: Instantly matches live surveillance captures against official S3 database mugshots using secure AWS Presigned URLs.
* **⚡ Hybrid Cloud Ingestion Pipeline**:
  - **Serverless Event-Driven**: Automatic background indexing via S3 Object-Created events triggering AWS Lambda.
  - **Direct Indexing Fallback**: Zero-latency biometric indexing directly into Rekognition and DynamoDB on registration.
* **🗄️ Suspect Database Gallery**: Interactive digital mugshot vault querying DynamoDB records and displaying active status badges (`WANTED`, `CLEARED`, `UNDER INVESTIGATION`).
* **📜 Surveillance Audit Logging & CSV Export**: Immutable tracking of every scan event (timestamp, suspect, status, confidence) with one-click official CSV export.
* **🐳 Fully Dockerized**: Production-ready `Dockerfile` and `docker-compose.yml` for unified one-command execution.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    subgraph Client ["Frontend (Next.js 16 + Tailwind CSS)"]
        UI["Live Scanner / Registration / Audit Logs"]
    end

    subgraph Backend ["API Layer (FastAPI)"]
        API["FastAPI App (/api/recognize, /api/register, /api/audit-logs)"]
    end

    subgraph AWS ["Amazon Web Services (ap-south-1)"]
        S3[("Amazon S3 Vault\n/criminals/*.jpg")]
        Lambda["AWS Lambda Worker\n(Face Indexer)"]
        Rekognition{{"Amazon Rekognition\n(Biometric Collection)"}}
        DynamoDB[("Amazon DynamoDB\n(criminal_records)")]
    end

    UI -->|"1. Snap/Upload Photo"| API
    API -->|"2. Biometric Vector Search"| Rekognition
    Rekognition -->|"3. Match Confirmed (FaceId)"| API
    API -->|"4. Lookup Criminal Profile"| DynamoDB
    API -->|"5. Generate Presigned Mugshot URL"| S3
    API -->|"6. Return Coordinates + Profile + Mugshot"| UI

    UI -->|"Register New Suspect"| API
    API -->|"Store Image with Metadata"| S3
    S3 -.->|"ObjectCreated Trigger"| Lambda
    Lambda -->|"Index Biometrics"| Rekognition
    Lambda -->|"Write Record"| DynamoDB
```

---

## 📁 Repository Structure

```
CrimeVision-App/
├── .github/workflows/ci.yml       # GitHub Actions CI/CD Pipeline
├── api/                           # FastAPI Backend
│   ├── lambda_deploy/             # AWS Lambda Handler & Deployment Package
│   │   └── lambda_function.py     # S3 -> Rekognition -> DynamoDB indexer
│   ├── Dockerfile                 # Backend container definition
│   ├── main.py                    # Core REST API (biometrics, S3, audit logs)
│   ├── requirements.txt           # Python dependencies
│   ├── setup_aws.py               # Automated AWS infrastructure provisioning
│   └── .env                       # Cloud credentials & region config
├── frontend/                      # Next.js 16 App Router
│   ├── src/app/
│   │   ├── page.tsx               # Live Biometric Scanner & Bounding Box UI
│   │   ├── register/page.tsx      # Cloud Suspect Enrollment Form
│   │   ├── audit/page.tsx         # Audit Trail & CSV Exporter
│   │   ├── suspects/page.tsx      # Digital Suspect Mugshot Gallery
│   │   └── layout.tsx             # Navigation header & dark theme wrapper
│   ├── Dockerfile                 # Frontend container definition
│   └── package.json               # Next.js & UI dependencies
├── docker-compose.yml             # Full-stack Docker composition
└── README.md                      # Complete Project Documentation
```

---

## ⚡ Quickstart Guide

### Option 1: Run with Docker Compose (Recommended)

Make sure Docker is running on your machine, then run:

```bash
docker compose up --build
```
* **Frontend**: [http://localhost:3000](http://localhost:3000)
* **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Option 2: Run Locally (Development Mode)

#### 1. Configure Cloud Credentials
Create `api/.env`:
```env
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1
S3_BUCKET_NAME=crimevision-mugshots-bucket-unique
DYNAMODB_TABLE=criminal_records
REKOGNITION_COLLECTION=criminal_collection
```

#### 2. Provision AWS Infrastructure
```bash
cd api
python setup_aws.py
```

#### 3. Start Backend
```bash
cd api
# Activate virtual environment
.\venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

#### 4. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/recognize` | Analyzes image bytes, detects face, searches Rekognition, returns metadata & presigned mugshot URL |
| `POST` | `/api/register` | Stores mugshot in S3, indexes face vector in Rekognition, and persists profile in DynamoDB |
| `GET` | `/api/suspects` | Retrieves all registered suspect profiles with temporary S3 presigned URLs |
| `GET` | `/api/audit-logs` | Fetches historical scan events for surveillance auditing |
| `DELETE`| `/api/audit-logs` | Clears local audit history |
| `GET` | `/api/health` | Service health status and active AWS region |

---

## 🔒 Security Best Practices

1. **Least-Privilege IAM**: AWS credentials require access strictly scoped to the `criminal_records` DynamoDB table, `criminal_collection` Rekognition collection, and `crimevision-mugshots-*` S3 bucket.
2. **S3 Presigned URLs**: Biometric mugshot images are kept private in S3 with public access blocked. Mugshots are rendered in the UI via time-limited, cryptographically signed AWS Presigned URLs (expires in 1 hour).
3. **Zero Secrets in Git**: Sensitive credentials are kept strictly in `.env` and excluded from version control via `.gitignore`.
