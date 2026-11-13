@echo off
title AlphaDate Local AI Daemon (Port 4789 / 4790)
cd /d "%~dp0"
echo ====================================================
echo    Starting AlphaDate Personal AI Local Daemon...
echo ====================================================
node packages/local-app/dist/index.js
pause
