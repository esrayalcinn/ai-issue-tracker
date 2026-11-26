@echo off
setlocal
cd /d "%~dp0"

echo Starting Issue Notebook desktop widget...

:: 1. Start PostgreSQL container
docker compose up -d >nul 2>&1

:: 2. Start FastAPI backend on port 8000 if not already listening
powershell -NoProfile -Command "if (-not (Test-NetConnection -ComputerName 127.0.0.1 -Port 8000 -InformationLevel Quiet)) { Start-Process -WindowStyle Minimized -WorkingDirectory '%~dp0backend' -FilePath 'uv' -ArgumentList 'run','uvicorn','app.main:app','--port','8000' }"

:: 3. Start Next.js frontend on dedicated port 3050 if not already listening
powershell -NoProfile -Command "if (-not (Test-NetConnection -ComputerName 127.0.0.1 -Port 3050 -InformationLevel Quiet)) { Start-Process -WindowStyle Minimized -WorkingDirectory '%~dp0frontend' -FilePath 'cmd' -ArgumentList '/c','npm run dev -- -p 3050' }"

:: 4. Wait up to 25 seconds for the frontend to be ready
powershell -NoProfile -Command "for ($i=0; $i -lt 50; $i++) { if (Test-NetConnection -ComputerName 127.0.0.1 -Port 3050 -InformationLevel Quiet) { break }; Start-Sleep -Milliseconds 500 }"

:: 5. Open /widget as a clean standalone desktop app window (no tabs or address bar)
set "WIDGET_URL=http://localhost:3050/widget"
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=%WIDGET_URL% --window-size=380,620
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=%WIDGET_URL% --window-size=380,620
) else (
    start "" %WIDGET_URL%
)
