@echo off
:: 确保在脚本所在目录运行
cd /d "%~dp0"
chcp 65001 >nul
title Neo Dining Ultimate Launcher
color 0A
cls

echo ========================================================
echo   Neo Dining - 强力启动修复版
echo ========================================================
echo.
echo 请选择操作模式:
echo [1] 直接启动 (如果之前运行正常)
echo [2] 清理并重新安装依赖 (如果启动报错或白屏，选这个!)
echo.
set /p choice=请输入数字 [1 或 2]: 

if "%choice%"=="2" goto CLEAN_INSTALL
goto START_APP

:CLEAN_INSTALL
echo.
echo [!] 正在删除旧的依赖文件...
if exist "frontend\node_modules" rmdir /s /q "frontend\node_modules"
if exist "frontend\package-lock.json" del "frontend\package-lock.json"
echo [!] 正在清理缓存并重新安装...
cd frontend
call npm install
cd ..
echo [!] 依赖重装完成!

:START_APP
echo.
echo [Step 1] 启动后端...
:: 检查 backend 目录
if not exist backend (
    echo [ERROR] 找不到 backend 目录! 请确认脚本位置。
    pause
    exit
)
start "Backend Server" cmd /k "chcp 65001 && cd backend && pip install -r requirements.txt && python app.py"

echo.
echo [Step 2] 启动前端...
:: 检查 frontend 目录
if not exist frontend (
    echo [ERROR] 找不到 frontend 目录!
    pause
    exit
)
cd frontend
:: 检查是否真的安装了 vite
if not exist "node_modules\.bin\vite.cmd" (
    echo [WARNING] 未检测到 Vite，正在尝试自动修复...
    call npm install
)
start "Frontend Server" cmd /k "chcp 65001 && npm run dev"
cd ..

echo.
echo ========================================================
echo   正在尝试打开浏览器...
echo   请检查弹出的两个新窗口是否有红色报错。
echo   如果浏览器看到白屏，请按 F12 看 Console 面板。
echo ========================================================
pause