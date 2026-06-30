@echo off
echo === 555 Dashboard + Voice Bridge ===
echo.

REM Kill any existing node processes
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

REM Start bridge
echo Starting Voice Bridge on :5555...
start "555-Bridge" cmd /c "set NVM_DIR=%USERPROFILE%\.nvm && call %USERPROFILE%\.nvm\nvm.exe use 20 >nul && node C:\Users\ngblu\555-dashboard\bridge\server.js"

REM Wait for bridge
timeout /t 3 /nobreak >nul

REM Start dashboard
echo Starting Dashboard on :3000...
start "555-Dashboard" cmd /c "set NVM_DIR=%USERPROFILE%\.nvm && call %USERPROFILE%\.nvm\nvm.exe use 20 >nul && cd /d C:\Users\ngblu\555-dashboard && npx next dev -p 3000"

echo.
echo Both services starting...
echo Dashboard: http://localhost:3000
echo Bridge:    http://localhost:5555
echo.
pause
