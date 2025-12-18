@echo off
setlocal

echo ==========================================
echo      Neo Dining System (Refactored)
echo ==========================================

if not exist "backend" (
    echo [ERROR] 'backend' folder not found.
    pause
    exit /b
)

echo [1/3] Checking Environment...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found.
    pause
    exit /b
)

call npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found.
    pause
    exit /b
)

echo [2/3] Building Frontend (This may take a minute)...
cd frontend
call npm install
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build Failed!
    cd ..
    pause
    exit /b
)
cd ..

echo [3/3] Starting Server...
echo Open http://localhost:5000 in your browser.

cd backend
pip install -r requirements.txt
python app.py
pause