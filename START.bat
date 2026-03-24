@echo off
chcp 65001 >nul
title LamNguyenShip - Quick Start

echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║       LamNguyenShip - Quick Start Script            ║
echo  ║       Driver App + Admin App + Backend              ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js chua duoc cai dat!
    echo Vui long cai tu: https://nodejs.org/
    pause
    exit /b 1
)

:: Check MongoDB URI
findstr /C:"<username>" "%~dp0backend\.env" >nul 2>&1
if %errorlevel% equ 0 (
    echo [WARNING] Ban chua cau hinh MongoDB URI!
    echo Vui long mo backend/.env va cap nhat MONGO_URI
    echo.
    echo Huong dan:
    echo   1. Truy cap https://www.mongodb.com/atlas
    echo   2. Tao cluster va lay connection string
    echo   3. Dan vao backend/.env
    echo.
    pause
)

echo [OK] Dependencies da san sang!
echo.

:: Ask to start
set /p choice="Khoi dong tat ca cac server? (Y/N): "
if /i "%choice%" neq "Y" goto :end

echo.
echo [1/3] Khoi dong Backend...
start "LamNguyenShip - Backend" cmd /k "cd /d "%~dp0backend" && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/3] Khoi dong Driver App...
start "LamNguyenShip - Driver App" cmd /k "cd /d "%~dp0driver-app" && npm run dev"

timeout /t 2 /nobreak >nul

echo [3/3] Khoi dong Admin App...
start "LamNguyenShip - Admin App" cmd /k "cd /d "%~dp0admin-app" && npm run dev"

echo.
echo ════════════════════════════════════════════════════════════
echo.
echo [SUCCESS] Tat ca server da khoi dong!
echo.
echo   Driver App:    http://localhost:5173
echo   Admin App:     http://localhost:5174
echo   Backend API:   http://localhost:5000
echo   API Health:    http://localhost:5000/api/health
echo.
echo   Admin Login:   0909123456 / admin123
echo   Driver Login:  0911111111 / driver123
echo.
echo ════════════════════════════════════════════════════════════
echo.

:end
pause
