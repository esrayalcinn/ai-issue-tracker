@echo off
echo Stopping Issue Notebook backend (port 8000) and widget frontend (port 3050)...
powershell -NoProfile -Command "foreach ($port in @(8000, 3050)) { Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }"
echo Done! (PostgreSQL container left running; run 'docker compose stop' if you want to stop it too.)
pause
