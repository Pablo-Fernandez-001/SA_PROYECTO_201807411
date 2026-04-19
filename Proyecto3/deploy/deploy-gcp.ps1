############################################################################
# DeliverEats — Script de deploy desde Windows (PowerShell)
# Ejecuta paso a paso desde tu máquina local
############################################################################

param(
    [string]$ProjectId = "",
    [string]$Zone = "us-central1-a",
    [string]$VmName = "delivereats-vm",
    [string]$MachineType = "e2-medium"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  DeliverEats — Deploy a GCP" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar gcloud
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: gcloud CLI no encontrado." -ForegroundColor Red
    Write-Host ""
    Write-Host "Instala Google Cloud SDK desde:" -ForegroundColor Yellow
    Write-Host "  https://cloud.google.com/sdk/docs/install" -ForegroundColor White
    Write-Host ""
    Write-Host "Despues ejecuta:" -ForegroundColor Yellow
    Write-Host "  gcloud init" -ForegroundColor White
    Write-Host "  gcloud auth login" -ForegroundColor White
    exit 1
}

# Verificar proyecto
if ([string]::IsNullOrEmpty($ProjectId)) {
    $ProjectId = gcloud config get-value project 2>$null
    if ([string]::IsNullOrEmpty($ProjectId)) {
        $ProjectId = Read-Host "Ingresa tu Project ID de GCP"
        gcloud config set project $ProjectId
    }
}

Write-Host "Proyecto GCP: $ProjectId" -ForegroundColor Green
Write-Host "Zona: $Zone" -ForegroundColor Green
Write-Host "VM: $VmName ($MachineType)" -ForegroundColor Green
Write-Host ""

# Paso 1: Crear la VM
Write-Host "[1/5] Creando VM..." -ForegroundColor Yellow
$vmExists = gcloud compute instances list --filter="name=$VmName" --format="value(name)" 2>$null
if ($vmExists) {
    Write-Host "  VM ya existe, saltando creacion." -ForegroundColor DarkYellow
} else {
    gcloud compute instances create $VmName `
        --project=$ProjectId `
        --zone=$Zone `
        --machine-type=$MachineType `
        --image-family=ubuntu-2204-lts `
        --image-project=ubuntu-os-cloud `
        --boot-disk-size=30GB `
        --boot-disk-type=pd-standard `
        --tags=http-server,https-server `
        --metadata=startup-script='#!/bin/bash
apt-get update -y
curl -fsSL https://get.docker.com | sh
usermod -aG docker $(whoami)
apt-get install -y docker-compose-plugin git'
    
    Write-Host "  VM creada. Esperando 30s para que inicie..." -ForegroundColor Green
    Start-Sleep -Seconds 30
}

# Paso 2: Crear reglas de firewall
Write-Host "[2/5] Configurando firewall..." -ForegroundColor Yellow
$fwExists = gcloud compute firewall-rules list --filter="name=allow-delivereats" --format="value(name)" 2>$null
if ($fwExists) {
    Write-Host "  Regla de firewall ya existe." -ForegroundColor DarkYellow
} else {
    gcloud compute firewall-rules create allow-delivereats `
        --project=$ProjectId `
        --allow=tcp:3000,tcp:8080 `
        --target-tags=http-server `
        --description="Allow DeliverEats frontend and API"
    Write-Host "  Firewall configurado." -ForegroundColor Green
}

# Paso 3: Subir archivos
Write-Host "[3/5] Subiendo archivos del proyecto..." -ForegroundColor Yellow
$projectPath = Split-Path -Parent $PSScriptRoot  # Esto es Proyecto1/

# Comprimir y subir
$tempZip = "$env:TEMP\delivereats-project.tar.gz"
Write-Host "  Comprimiendo proyecto..."

# Use tar to create archive (exclude node_modules, .git, volumes)
Push-Location $projectPath
tar -czf $tempZip --exclude='node_modules' --exclude='.git' --exclude='*_db_data' --exclude='logs/*.log' .
Pop-Location

gcloud compute scp $tempZip ${VmName}:~/delivereats-project.tar.gz --zone=$Zone --project=$ProjectId
Remove-Item $tempZip -ErrorAction SilentlyContinue
Write-Host "  Archivos subidos." -ForegroundColor Green

# Paso 4: Extraer y configurar en la VM
Write-Host "[4/5] Configurando proyecto en la VM..." -ForegroundColor Yellow
gcloud compute ssh $VmName --zone=$Zone --project=$ProjectId --command="
    mkdir -p ~/delivereats
    cd ~/delivereats
    tar -xzf ~/delivereats-project.tar.gz
    rm ~/delivereats-project.tar.gz
    chmod +x deploy/*.sh
    echo 'Archivos extraidos en ~/delivereats'
    ls -la
"

# Paso 5: Desplegar
Write-Host "[5/5] Desplegando con Docker Compose..." -ForegroundColor Yellow
gcloud compute ssh $VmName --zone=$Zone --project=$ProjectId --command="
    cd ~/delivereats
    bash deploy/start.sh
"

# Obtener IP pública
$publicIp = gcloud compute instances describe $VmName --zone=$Zone --project=$ProjectId --format="get(networkInterfaces[0].accessConfigs[0].natIP)"

Write-Host "" 
Write-Host "=========================================" -ForegroundColor Green
Write-Host "  DEPLOY COMPLETADO" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend: http://${publicIp}:3000" -ForegroundColor Cyan
Write-Host "  API:      http://${publicIp}:8080/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "  SSH a la VM:" -ForegroundColor White
Write-Host "    gcloud compute ssh $VmName --zone=$Zone" -ForegroundColor Gray
Write-Host ""
Write-Host "  Ver logs:" -ForegroundColor White
Write-Host "    gcloud compute ssh $VmName --zone=$Zone --command='cd ~/delivereats && docker compose logs -f'" -ForegroundColor Gray
Write-Host ""
