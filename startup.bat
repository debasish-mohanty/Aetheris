@echo off
title Aetheris - Startup
color 0B
echo.
echo  ============================================
echo     ✧ Aetheris - Immersive AI Roleplay
echo  ============================================
echo.

:: ── Check Python ──
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Python is not installed or not in PATH.
    echo  Please install Python 3.10+ from https://python.org
    pause
    exit /b 1
)

:: ── Check Node.js ──
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo  Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

:: ── Prompt for ports ──
echo  Configure your server ports (press Enter for defaults):
echo.
set /p BACKEND_PORT="  Backend API port   [default: 8000]: "
if "%BACKEND_PORT%"=="" set BACKEND_PORT=8000

set /p FRONTEND_PORT="  Frontend UI port   [default: 3000]: "
if "%FRONTEND_PORT%"=="" set FRONTEND_PORT=3000

set /p OLLAMA_URL="  Ollama URL         [default: http://localhost:11434]: "
if "%OLLAMA_URL%"=="" set OLLAMA_URL=http://localhost:11434

echo.
echo  ────────────────────────────────────────────
echo   Backend API :  http://localhost:%BACKEND_PORT%
echo   Frontend UI :  http://localhost:%FRONTEND_PORT%
echo   Ollama      :  %OLLAMA_URL%
echo  ────────────────────────────────────────────
echo.

:: ── Install backend dependencies ──
echo  [1/4] Installing backend dependencies...
cd /d "%~dp0backend"
pip install -r requirements.txt --quiet >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo  [WARN] Some backend packages may have failed. Continuing...
)
echo        Done.

:: ── Install frontend dependencies ──
echo  [2/4] Installing frontend dependencies...
cd /d "%~dp0frontend"
if not exist "node_modules" (
    call npm install --silent >nul 2>nul
) else (
    echo        node_modules exists, skipping install.
)
echo        Done.

:: ── Set environment variables ──
set API_PORT=%BACKEND_PORT%
set API_HOST=0.0.0.0
set OLLAMA_BASE_URL=%OLLAMA_URL%
set PYTHON_CMD=python

REM ── Start services ──
echo.
echo  [3/4] Starting Aetheris services...

REM Start Backend
set API_PORT=%BACKEND_PORT%
set API_HOST=0.0.0.0
set OLLAMA_BASE_URL=%OLLAMA_URL%
cd /d "%~dp0backend"
start /b "" "%PYTHON_CMD%" -m uvicorn app.main:app --host 0.0.0.0 --port %BACKEND_PORT% --no-access-log > nul 2>&1

REM Start Frontend
cd /d "%~dp0frontend"
echo VITE_API_PORT=%BACKEND_PORT%> .env.local
echo VITE_BACKEND_URL=http://localhost:%BACKEND_PORT%>> .env.local
start /b "" npx vite --port %FRONTEND_PORT% --clearScreen false > nul 2>&1

echo.
echo  ============================================
echo     ✧ Aetheris is now active!
echo  ============================================
echo.
echo     Interface:  http://localhost:%FRONTEND_PORT%
echo     Backend API: http://localhost:%BACKEND_PORT%/health
echo.
echo     Running in single-prompt mode.
echo     Keep this window open to maintain services.
echo     Press Ctrl+C twice to stop everything.
echo.
echo  ============================================
echo.

REM ── Open Browser ──
timeout /t 3 /nobreak > nul
start http://localhost:%FRONTEND_PORT%

REM ── Keep window open ──
:wait_loop
timeout /t 10 /nobreak > nul
goto wait_loop
