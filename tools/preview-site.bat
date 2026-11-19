@echo off
rem Preview the Machine Vision Guy site at http://localhost:8000
rem Double-click this file. Close the window to stop the preview.
setlocal
pushd "%~dp0.."
if errorlevel 1 goto nofolder
echo Site folder: %CD%
python --version
if errorlevel 1 goto nopy
echo.
echo Preview running at http://localhost:8000
echo Close this window to stop it.
echo.
start "" http://localhost:8000/
python -m http.server 8000
pause
goto :eof
:nofolder
echo Could not open the site folder from "%~dp0".
pause
goto :eof
:nopy
echo Python did not start from this window.
echo Open a terminal in the site folder and run: python -m http.server 8000
pause
