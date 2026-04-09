$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\.."

docker compose up --build -d
Write-Host "Services started." -ForegroundColor Green
Write-Host "Run smoke test with: .\scripts\smoke-test.ps1"
