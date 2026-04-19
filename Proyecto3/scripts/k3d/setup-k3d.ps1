Param(
  [string]$ClusterName = "delivereats-k3d",
  [int]$Agents = 2
)

$ErrorActionPreference = "Stop"

k3d cluster delete $ClusterName 2>$null
k3d cluster create $ClusterName --agents $Agents --port "8080:80@loadbalancer"

kubectl config use-context "k3d-$ClusterName"
kubectl create namespace delivereats --dry-run=client -o yaml | kubectl apply -f -

Write-Host "k3d cluster ready: $ClusterName" -ForegroundColor Green
