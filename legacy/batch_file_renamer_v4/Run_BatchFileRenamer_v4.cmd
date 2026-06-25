@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File "%~dp0BatchFileRenamer_v4.ps1"
if errorlevel 1 (
    echo.
    echo BatchFileRenamer v4 failed to start.
    echo Company PowerShell policy may be blocking script execution.
    pause
)
