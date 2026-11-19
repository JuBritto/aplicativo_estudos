@echo off
cd /d "%~dp0"

set "EDGE_X86=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
set "EDGE_X64=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"

if exist "%EDGE_X86%" (
    start "" "%EDGE_X86%" --app="%~dp0index.html#widget" --window-size=380,720
    exit /b
)

if exist "%EDGE_X64%" (
    start "" "%EDGE_X64%" --app="%~dp0index.html#widget" --window-size=380,720
    exit /b
)

start "" "%~dp0index.html#widget"
exit /b
