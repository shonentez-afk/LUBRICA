@echo off
chcp 65001 >nul
setlocal
set "LUBRICA_ROOT=%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root = $env:LUBRICA_ROOT.TrimEnd('\');" ^
  "$html = Join-Path $root 'index.html';" ^
  "$ico = Join-Path $root 'assets\icons\lubrica-shortcut.ico';" ^
  "$desktop = [Environment]::GetFolderPath('Desktop');" ^
  "$edgeCandidates = @(" ^
  "  (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe')," ^
  "  (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe')" ^
  ") | Where-Object { $_ -and (Test-Path $_) };" ^
  "$edge = $edgeCandidates | Select-Object -First 1;" ^
  "if (-not $edge) { $cmd = Get-Command msedge.exe -ErrorAction SilentlyContinue; if ($cmd) { $edge = $cmd.Source } };" ^
  "if (-not $edge) { Write-Host 'Microsoft Edge не найден.' -ForegroundColor Red; exit 2 };" ^
  "if (-not (Test-Path $html)) { Write-Host 'index.html не найден.' -ForegroundColor Red; exit 3 };" ^
  "if (-not (Test-Path $ico)) { Write-Host 'Иконка ярлыка не найдена.' -ForegroundColor Red; exit 4 };" ^
  "$lnk = Join-Path $desktop 'LUBRICA.lnk';" ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$sc = $ws.CreateShortcut($lnk);" ^
  "$sc.TargetPath = $edge;" ^
  "$sc.Arguments = '\"' + $html + '\"';" ^
  "$sc.WorkingDirectory = $root;" ^
  "$sc.IconLocation = $ico + ',0';" ^
  "$sc.Description = 'LUBRICA — управление смазочным обслуживанием';" ^
  "$sc.Save();" ^
  "Write-Host ('Ярлык создан: ' + $lnk) -ForegroundColor Green"

if errorlevel 1 (
  echo.
  echo Не удалось создать ярлык LUBRICA.
  pause
  exit /b 1
)

echo.
echo Ярлык LUBRICA создан на рабочем столе.
pause
endlocal
