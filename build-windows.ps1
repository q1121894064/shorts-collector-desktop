# 本地 Windows 构建脚本（PowerShell）
# 先决条件：
# - Node.js 18+ 已安装
# - Visual Studio Build Tools（Desktop development with C++）已安装
# - Python 3 可用（用于 node-gyp）
# 运行：
# powershell -ExecutionPolicy Bypass -File .\build-windows.ps1

Write-Host "Installing dependencies..."
npm ci

Write-Host "Rebuilding native modules for Electron..."
npx electron-rebuild -f -w better-sqlite3

Write-Host "Building Windows installer (x64)... This may take a few minutes."
npx electron-builder --win --x64 --publish never

if ($LASTEXITCODE -ne 0) {
  Write-Error "Build failed with exit code $LASTEXITCODE"
  exit $LASTEXITCODE
}

Write-Host "Build finished. Installer files in the dist/ directory:"
Get-ChildItem -Path .\dist\ -Filter *.exe | ForEach-Object { Write-Host $_.FullName }
