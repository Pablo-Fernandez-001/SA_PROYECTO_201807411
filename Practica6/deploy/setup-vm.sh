#!/bin/bash
############################################################################
# DeliverEats — VM Setup Script
# Corre esto EN LA VM de GCP después de conectarte por SSH
############################################################################

set -e

echo "========================================="
echo "  DeliverEats — Configuración de VM"
echo "========================================="

# 1. Actualizar sistema
echo "[1/4] Actualizando sistema..."
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Instalar Docker
echo "[2/4] Instalando Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com -o get-docker.sh
  sudo sh get-docker.sh
  sudo usermod -aG docker $USER
  rm get-docker.sh
  echo "Docker instalado correctamente."
else
  echo "Docker ya está instalado."
fi

# 3. Instalar Docker Compose plugin
echo "[3/4] Instalando Docker Compose..."
if ! docker compose version &> /dev/null; then
  sudo apt-get install -y docker-compose-plugin
  echo "Docker Compose instalado correctamente."
else
  echo "Docker Compose ya está instalado."
fi

# 4. Instalar git
echo "[4/4] Instalando git..."
sudo apt-get install -y git

echo ""
echo "========================================="
echo "  VM configurada correctamente"
echo "========================================="
echo ""
echo "SIGUIENTE PASO:"
echo "  1. Cierra sesión SSH y vuelve a conectarte (para permisos Docker)"
echo "     exit"
echo "     gcloud compute ssh delivereats-vm"
echo ""
echo "  2. Luego clona tu repo o sube los archivos:"
echo "     git clone <TU_REPO_URL> proyecto"
echo "     cd proyecto/Proyecto1"
echo ""
echo "  3. Ejecuta el script de deploy:"
echo "     bash deploy/start.sh"
echo ""
