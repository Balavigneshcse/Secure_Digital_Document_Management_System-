# SentinelDMS (Secure Digital Document Management System)

SentinelDMS is a comprehensive digital document management system featuring a Python FastAPI backend, a React frontend, and an AI service for advanced document analysis.

## Project Structure

- `backend/`: FastAPI application handling core business logic, database, and API endpoints.
- `frontend/`: React-based user interface.
- `ai-service/`: Dedicated microservice for AI processing and analysis.

## Prerequisites

- **Python 3.8+**
- **Node.js 16+** and **npm**
- **PowerShell** (for running the startup scripts on Windows)

## How to Run the Project

You can run the project using the provided PowerShell scripts. Make sure to run these from the root directory of the project.

### Option 1: Start All Services (Backend, AI Service, Frontend)
This will launch the backend, the AI service, and the frontend in separate terminal windows.

```powershell
.\start-all.ps1
```

### Option 2: Start Core Services Only (Backend, Frontend)
This will launch only the core backend and frontend services, skipping the AI service.

```powershell
.\start-core.ps1
```

### Manual Setup (If scripts don't work)

#### 1. Backend
```bash
cd backend
python -m venv venv
# Activate venv (Windows): .\venv\Scripts\activate
# Activate venv (Mac/Linux): source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### 2. AI Service
```bash
cd ai-service
python -m venv venv
# Activate venv (Windows): .\venv\Scripts\activate
# Activate venv (Mac/Linux): source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

#### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

The frontend will be accessible at the URL shown in the terminal (usually `http://localhost:5173`).
The backend API documentation is available at `http://localhost:8000/docs`.
