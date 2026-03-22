@echo off
REM Permission Mapper - Build Script for Windows
REM Double-click this file to build the standalone executable

echo ========================================
echo   Permission Mapper - Build Script
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

echo Step 1: Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo Step 2: Installing visualizer dependencies...
cd visualizer
call npm install
cd ..
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install visualizer dependencies!
    pause
    exit /b 1
)

echo.
echo Step 3: Building React app...
cd visualizer
call npm run build
cd ..
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to build React app!
    pause
    exit /b 1
)

echo.
echo Step 4: Building Windows executable...
call npx electron-builder --win portable
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to build executable!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Build Complete!
echo ========================================
echo.
echo The executable is in the 'release' folder:
dir /b release\*.exe
echo.
echo To run the app, double-click the .exe file.
echo No Node.js installation required!
echo.
pause

