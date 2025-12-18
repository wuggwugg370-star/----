@echo off
title Neo Dining Local Runner
color 0A

echo ========================================================
echo        Neo Dining - 全自动启动脚本 (Windows)
echo ========================================================

:: 1. 检查 Python 环境并安装后端依赖
echo.
echo [1/4] 正在检查后端依赖...
pip install -r backend/requirements.txt
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Python 依赖安装失败！请检查是否安装了 Python 并且添加到环境变量。
    pause
    exit /b
)

:: 2. 检查 Node 环境并安装前端依赖
echo.
echo [2/4] 正在检查前端依赖...
cd frontend
if not exist node_modules (
    echo 检测到首次运行，正在安装 npm 依赖（可能需要几分钟）...
    call npm install
) else (
    echo 依赖已存在，跳过安装（如需重装请手动删除 node_modules）
)
cd ..

:: 3. 启动后端 (新窗口)
echo.
echo [3/4] 启动后端服务 (Port 5000)...
start "NeoDining Backend" cmd /k "cd backend && python app.py"

:: 4. 启动前端 (新窗口)
echo.
echo [4/4] 启动前端服务 (Port 5173)...
start "NeoDining Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo   启动成功！
echo   前端访问地址: http://localhost:5173
echo   (请勿关闭弹出的两个黑色命令窗口)
echo ========================================================
pause