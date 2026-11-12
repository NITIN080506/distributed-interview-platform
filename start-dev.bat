@echo off
echo ==============================================================
echo  Distributed Real-Time Code Execution & Interview Platform
echo ==============================================================
echo.
echo [1/3] Starting API Gateway and WebSockets Server (Port 5000)...
start "CodePulse API Server" cmd /k "cd server && npm run dev"

echo [2/3] Starting Redis BullMQ Code Execution Worker...
start "CodePulse Sandbox Worker" cmd /k "cd worker && npm run dev"

echo [3/3] Starting React Client (Port 5173)...
start "CodePulse Frontend" cmd /k "cd client && npm run dev"

echo.
echo All services launched!
echo Open your browser at http://localhost:5173
pause
