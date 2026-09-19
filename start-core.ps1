# start-core.ps1
Write-Host "Starting SentinelDMS Core Services (Backend, Frontend)..."

# 1. Start Backend
# Run alembic migrations first if needed (using SQLite now)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$host.ui.RawUI.WindowTitle='SentinelDMS - Backend'; cd backend; .\venv\Scripts\alembic.exe upgrade head; .\venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000" -WindowStyle Normal

# 2. Start Frontend
Start-Process cmd.exe -ArgumentList "/k", "title SentinelDMS - Frontend && cd frontend && npm run dev" -WindowStyle Normal

Write-Host "Core services started! Check the new PowerShell windows."
