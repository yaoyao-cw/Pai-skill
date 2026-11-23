@echo off
setlocal
if defined BC_NODE if exist "%BC_NODE%" goto run
for /f "delims=" %%N in ('where node 2^>nul') do if not defined BC_NODE set "BC_NODE=%%N"
if not defined BC_NODE (
  echo Node.js 22+ with native fetch and WebSocket is required.
  echo Install Node.js 22+ on PATH or set BC_NODE=/path/to/node.exe
  exit /b 1
)
:run
"%BC_NODE%" "%~dp0bin\capture.cjs" %*
exit /b %errorlevel%
