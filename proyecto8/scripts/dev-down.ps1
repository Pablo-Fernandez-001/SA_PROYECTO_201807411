$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\.."

docker compose down -v
Write-Host "Services stopped and volumes removed." -ForegroundColor Yellow
