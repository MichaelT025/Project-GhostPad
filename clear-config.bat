@echo off
echo Deleting old GhostPad config file...
del "%APPDATA%\ghostpad\ghostpad-config.json" 2>nul
if %errorlevel% equ 0 (
    echo Config file deleted successfully!
) else (
    echo No config file found or already deleted.
)
echo.
echo Now restart the app with: npm start
pause
