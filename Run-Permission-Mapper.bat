@echo off
REM Permission Mapper - Quick Start
REM Double-click this file to run the application

set "EXE_PATH=%~dp0release\Permission-Mapper-Portable.exe"

if exist "%EXE_PATH%" (
    echo Starting Permission Mapper...
    start "" "%EXE_PATH%"
) else (
    echo.
    echo =============================================
    echo   Permission Mapper - Setup Required
    echo =============================================
    echo.
    echo The executable hasn't been built yet.
    echo.
    echo Please run 'build.bat' to build the application.
    echo.
    echo This is a one-time setup that will:
    echo   1. Install dependencies (Node.js required)
    echo   2. Build the React dashboard
    echo   3. Create the Windows executable
    echo.
    pause
)
