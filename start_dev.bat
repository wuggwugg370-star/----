@echo off
title Neo Dining Launcher

echo [1/2] Starting Flask Backend...
:: 进入 backend 目录启动 Python，保留窗口 (/k) 以便查看报错
start "Backend (Port 5000)" /D "backend" cmd /k "python app.py"

echo [2/2] Starting Vite Frontend...
:: 进入 frontend 目录启动开发服务器
start "Frontend (Port 5173)" /D "frontend" cmd /k "npm run dev"

echo ========================================================
echo   Success! Check the two new windows.
echo   Backend: http://localhost:5000
echo   Frontend: http://localhost:5173
echo ========================================================
pause