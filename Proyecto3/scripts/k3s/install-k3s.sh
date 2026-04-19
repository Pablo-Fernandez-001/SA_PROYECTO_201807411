#!/usr/bin/env bash
set -euo pipefail

curl -sfL https://get.k3s.io | sh -
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
kubectl create namespace delivereats --dry-run=client -o yaml | kubectl apply -f -

echo "k3s installed and namespace ready"
