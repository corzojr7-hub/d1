@echo off
setlocal
cd /d "%~dp0"

echo Iniciando Sistema de Control Operativo de Tienda...
echo.

start "APP 2" cmd /k "npm run dev"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$url='http://localhost:3000';" ^
  "$timeout = [DateTime]::Now.AddSeconds(60);" ^
  "while([DateTime]::Now -lt $timeout) {" ^
  "  try {" ^
  "    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2;" ^
  "    if ($r.StatusCode -ge 200) { Start-Process $url; exit 0 }" ^
  "  } catch { Start-Sleep -Milliseconds 800 }" ^
  "}" ^
  "Start-Process $url"

endlocal
