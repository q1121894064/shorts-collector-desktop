# PowerShell: create_zip.ps1
# Run: powershell -ExecutionPolicy Bypass -File .\create_zip.ps1
$Out = "shorts-collector-desktop.zip"
if (Test-Path $Out) { Remove-Item $Out }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory((Resolve-Path ".").Path, (Resolve-Path $Out).Path)
Write-Host "Created $Out"
