# SentinelDMS
**Secure Digital Document Management System for Legal and Investigation Documents**

SentinelDMS is a unified platform for police, forensic labs, and courts to upload, verify, and query legal documents securely. It combines offline OCR, Zero-Shot AI Classification, FAISS Semantic Search, Local RAG Chatbots (Llama3), and Hyperledger Fabric Blockchain to ensure 100% data sovereignty and evidence integrity.

## System Architecture

Our repository is organized as a clean monorepo:

*   `/frontend` - React, TypeScript, Vite, TailwindCSS (Investigator Dashboard)
*   `/backend` - NestJS (API Gateway, RBAC Auth, Audit Logging)
*   `/ai-service` - Python, FastAPI, HuggingFace, Tesseract (OCR, Classification, Search, Chatbot)
*   `/blockchain` - Hyperledger Fabric (Hash Anchoring)
*   `/database` - PostgreSQL + Prisma
*   `/keycloak` - Identity & Access Management (MFA, RBAC)

## How to Run Locally (Full Stack via Docker)

You only need **Docker Desktop** installed.

```bash
# 1. Clone the repository
git clone https://github.com/Balavigneshcse/Secure_Digital_Document_Management_System-
cd Secure_Digital_Document_Management_System-

# 2. Start the entire backend + AI stack (takes ~15 mins the first time to download AI models)
docker compose up -d

# 3. Check that all services are healthy
docker compose ps
```

### Running the Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Visit `http://localhost:5173` in your browser.

## AI Services Standalone
To run just the Python AI services without Docker:
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --reload
```
API Documentation available at `http://localhost:8000/docs`
