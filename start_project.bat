@echo off
chcp 65001 >nul
setlocal

echo =======================================================
echo        毕业设计启动脚本 (Neo Dining System)
echo =======================================================
echo.

:: --- 检查目录结构 ---
if not exist "backend\app.py" (
    echo [错误] 找不到 backend 目录或 app.py。
    echo 请确保本脚本放在 backend 和 frontend 的同级目录下！
    pause
    exit /b
)

:: --- 检查环境 ---
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Python，请安装 Python 并勾选 "Add to PATH"。
    pause
    exit /b
)
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js (npm)，请安装 Node.js。
    pause
    exit /b
)

:: --- 1. 后端依赖 ---
echo [1/4] 检查后端依赖...
cd backend
if not exist "venv" (
    echo 创建 Python 虚拟环境...
    python -m venv venv
)
call venv\Scripts\activate
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [警告] 依赖安装可能有问题，尝试继续...
)
cd ..

:: --- 2. 前端依赖 ---
echo.
echo [2/4] 检查前端依赖...
cd frontend
if not exist "node_modules" (
    echo 正在安装 npm 依赖 (可能需要几分钟)...
    call npm install
)
cd ..

:: --- 3. 前端构建 ---
echo.
echo [3/4] 构建前端资源...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo [错误] 前端构建失败，请检查报错信息。
    pause
    exit /b
)
cd ..

:: --- 4. 启动服务 ---
echo.
echo [4/4] 启动系统...
echo -------------------------------------------------------
echo 服务已启动！请在浏览器访问: http://localhost:5000
echo 管理员密码: admin123
echo (按 Ctrl+C 关闭窗口以停止服务)
echo -------------------------------------------------------

cd backend
:: 确保使用虚拟环境启动
call venv\Scripts\activate
python app.py

pause