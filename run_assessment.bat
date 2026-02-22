@echo off
title Grainger AI Safety Tool
color 0A
cls
echo ========================================================
echo        STARTING GRAINGER AI SAFETY TOOL
echo ========================================================
echo.
echo Launching optimized production server...
echo.
echo Once started, open your web browser to:
echo http://localhost:3000
echo.
cd /d "%~dp0"
npm start
pause
