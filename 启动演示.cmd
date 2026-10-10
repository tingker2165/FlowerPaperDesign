@echo off
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Python is required. Please install Python 3 or use its full path.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:8765 in your browser.
python "demo\serve.py"
pause
