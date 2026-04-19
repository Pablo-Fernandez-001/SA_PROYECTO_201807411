# Guía de Despliegue en Kubernetes - DeliverEats
## Versión 1.1.0 - Práctica 4 (Paso a Paso)

---

## Tabla de Contenidos

1. [Prerequisitos](#1-prerequisitos)
2. [Preparación del Entorno](#2-preparación-del-entorno)
3. [Construcción de Imágenes Docker](#3-construcción-de-imágenes-docker)
4. [Creación de Secrets y ConfigMaps](#4-creación-de-secrets-y-configmaps)
5. [Despliegue de Bases de Datos](#5-despliegue-de-bases-de-datos)
6. [Despliegue de RabbitMQ](#6-despliegue-de-rabbitmq)
7. [Despliegue de Redis](#7-despliegue-de-redis)
8. [Despliegue de Microservicios](#8-despliegue-de-microservicios)
9. [Despliegue del API Gateway](#9-despliegue-del-api-gateway)
10. [Despliegue del Frontend](#10-despliegue-del-frontend)
11. [Configuración del Ingress](#11-configuración-del-ingress)
12. [Verificación del Despliegue](#12-verificación-del-despliegue)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Prerequisitos

### 1.1 Software Requerido

**Instalado localmente:**
- [Docker Desktop](https://www.docker.com/products/docker-desktop) v20.10+
- [kubectl](https://kubernetes.io/docs/tasks/tools/) v1.25+
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (si usas GKE)
- [Git](https://git-scm.com/) v2.30+

**Verificar instalación:**
```powershell
docker --version
kubectl version --client
gcloud --version
git --version
```

### 1.2 Clúster de Kubernetes

**Opciones:**
- **Google Kubernetes Engine (GKE)** [Recomendado]
- Amazon EKS
- Azure AKS
- Minikube (desarrollo local)

**Configuración mínima del clúster:**
- Nodes: 3 (mínimo 2)
- Tipo de máquina: e2-medium (2 vCPUs, 4GB RAM)
- Kubernetes: v1.25+
- Regiones: us-central1 o similar

---

## 2. Preparación del Entorno

### 2.1 Crear Clúster en GKE

```powershell
# Autenticarse en GCP
gcloud auth login

# Configurar proyecto
gcloud config set project delivereats-proyecto

# Crear clúster
gcloud container clusters create delivereats-cluster `
  --zone us-central1-a `
  --num-nodes 3 `
  --machine-type e2-medium `
  --disk-size 50 `
  --enable-autoscaling --min-nodes 2 --max-nodes 10 `
  --enable-autorepair `
  --enable-autoupgrade

# Obtener credenciales para kubectl
gcloud container clusters get-credentials delivereats-cluster --zone us-central1-a
```

### 2.2 Crear Namespace

```powershell
kubectl create namespace delivereats
kubectl config set-context --current --namespace=delivereats
```

**Archivo:** `k8s/00-namespace.yaml`
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: delivereats
  labels:
    name: delivereats
    environment: production
```

```powershell
kubectl apply -f k8s/00-namespace.yaml
```

---

## 3. Construcción de Imágenes Docker

### 3.1 Configurar Docker Registry

**Opción 1: Docker Hub**
```powershell
docker login
# Usuario: tu_usuario
# Password: tu_contraseña
```

**Opción 2: Google Container Registry (GCR)**
```powershell
gcloud auth configure-docker
```

### 3.2 Build y Push de Imágenes

**Variables:**
```powershell
$DOCKER_REGISTRY = "docker.io/tu_usuario"  # o gcr.io/tu_proyecto
$VERSION = "v1.1.0"
```

**API Gateway:**
```powershell
cd api-gateway
docker build -t ${DOCKER_REGISTRY}/delivereats-api-gateway:${VERSION} .
docker push ${DOCKER_REGISTRY}/delivereats-api-gateway:${VERSION}
cd ..
```

**Auth Service:**
```powershell
cd auth-service
docker build -t ${DOCKER_REGISTRY}/delivereats-auth-service:${VERSION} .
docker push ${DOCKER_REGISTRY}/delivereats-auth-service:${VERSION}
cd ..
```

**Catalog Service:**
```powershell
cd catalog-service
docker build -t ${DOCKER_REGISTRY}/delivereats-catalog-service:${VERSION} .
docker push ${DOCKER_REGISTRY}/delivereats-catalog-service:${VERSION}
cd ..
```

**Order Service:**
```powershell
cd orders-service
docker build -t ${DOCKER_REGISTRY}/delivereats-orders-service:${VERSION} .
docker push ${DOCKER_REGISTRY}/delivereats-orders-service:${VERSION}
cd ..
```

**Delivery Service:**
```powershell
cd delivery-service
docker build -t ${DOCKER_REGISTRY}/delivereats-delivery-service:${VERSION} .
docker push ${DOCKER_REGISTRY}/delivereats-delivery-service:${VERSION}
cd ..
```

**Notification Service:**
```powershell
cd notification-service
docker build -t ${DOCKER_REGISTRY}/delivereats-notification-service:${VERSION} .
docker push ${DOCKER_REGISTRY}/delivereats-notification-service:${VERSION}
cd ..
```

**Frontend:**
```powershell
cd frontend
docker build -t ${DOCKER_REGISTRY}/delivereats-frontend:${VERSION} .
docker push ${DOCKER_REGISTRY}/delivereats-frontend:${VERSION}
cd ..
```

**Script automatizado** (`build-and-push.ps1`):
```powershell
$DOCKER_REGISTRY = "docker.io/tu_usuario"
$VERSION = "v1.1.0"

$services = @(
    "api-gateway",
    "auth-service",
    "catalog-service",
    "orders-service",
    "delivery-service",
    "notification-service",
    "frontend"
)

foreach ($service in $services) {
    Write-Host "Building $service..." -ForegroundColor Green
    cd $service
    docker build -t "${DOCKER_REGISTRY}/delivereats-${service}:${VERSION}" .
    docker push "${DOCKER_REGISTRY}/delivereats-${service}:${VERSION}"
    cd ..
}

Write-Host "All images built and pushed successfully!" -ForegroundColor Green
```

---

## 4. Creación de Secrets y ConfigMaps

### 4.1 Generar Secrets

**Crear claves seguras:**
```powershell
# Generar JWT Secret (base64)
$JWT_SECRET = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
$JWT_SECRET_B64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($JWT_SECRET))

# Generar MySQL Passwords (base64)
$MYSQL_ROOT_PASS = "Root_Pass_2026"
$MYSQL_ROOT_PASS_B64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($MYSQL_ROOT_PASS))

$AUTH_DB_PASS = "Auth_DB_Pass_2026"
$AUTH_DB_PASS_B64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($AUTH_DB_PASS))

# Generar RabbitMQ Password
$RMQ_PASS = "RabbitMQ_Pass_2026"
$RMQ_PASS_B64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($RMQ_PASS))

# Mostrar valores
Write-Host "JWT_SECRET (base64): $JWT_SECRET_B64"
Write-Host "MYSQL_ROOT_PASSWORD (base64): $MYSQL_ROOT_PASS_B64"
Write-Host "AUTH_DB_PASSWORD (base64): $AUTH_DB_PASS_B64"
Write-Host "RabbitMQ_PASSWORD (base64): $RMQ_PASS_B64"
```

**Archivo:** `k8s/01-secrets.yaml`
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: delivereats-secrets
  namespace: delivereats
type: Opaque
data:
  jwt-secret: <COPIAR_JWT_SECRET_B64>
  mysql-root-password: <COPIAR_MYSQL_ROOT_PASS_B64>
  auth-db-password: <COPIAR_AUTH_DB_PASS_B64>
  catalog-db-password: <COPIAR_CATALOG_DB_PASS_B64>
  orders-db-password: <COPIAR_ORDERS_DB_PASS_B64>
  delivery-db-password: <COPIAR_DELIVERY_DB_PASS_B64>
  rabbitmq-password: <COPIAR_RMQ_PASS_B64>
  smtp-password: <COPIAR_SMTP_PASS_B64>
```

**Aplicar:**
```powershell
kubectl apply -f k8s/01-secrets.yaml
kubectl get secrets -n delivereats
```

### 4.2 Crear ConfigMaps

**Archivo:** `k8s/02-configmaps.yaml`
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: delivereats-config
  namespace: delivereats
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  AUTH_SERVICE_URL: "auth-service:50051"
  CATALOG_SERVICE_URL: "catalog-service:50052"
  ORDER_SERVICE_URL: "order-service:50053"
  DELIVERY_SERVICE_URL: "delivery-service:50054"
  NOTIFICATION_SERVICE_URL: "notification-service:50055"
  RABBITMQ_URL: "amqp://delivereats:<PASSWORD>@rabbitmq-service:5672"
  REDIS_URL: "redis://redis-service:6379"
```

```powershell
kubectl apply -f k8s/02-configmaps.yaml
```

### 4.3 ConfigMaps para Init SQL

**Archivo:** `k8s/03-auth-db-init-configmap.yaml`
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: auth-db-init
  namespace: delivereats
data:
  init.sql: |
    CREATE DATABASE IF NOT EXISTS auth_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    USE auth_db;
    
    CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('ADMIN', 'CLIENTE', 'RESTAURANTE', 'REPARTIDOR') NOT NULL DEFAULT 'CLIENTE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    
    INSERT INTO users (id, name, email, password, role) VALUES
    ('admin-001', 'Administrador', 'admin@delivereats.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYHv.YqH6T6', 'ADMIN')
    ON DUPLICATE KEY UPDATE id=id;
```

```powershell
kubectl apply -f k8s/03-auth-db-init-configmap.yaml
```

---

## 5. Despliegue de Bases de Datos

### 5.1 Auth DB

**StatefulSet:** `k8s/10-auth-db.yaml`
```yaml
apiVersion: v1
kind: Service
metadata:
  name: auth-db-service
  namespace: delivereats
spec:
  type: ClusterIP
  ports:
  - port: 3306
    targetPort: 3306
  selector:
    app: auth-db

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: auth-db
  namespace: delivereats
spec:
  serviceName: auth-db
  replicas: 1
  selector:
    matchLabels:
      app: auth-db
  template:
    metadata:
      labels:
        app: auth-db
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        ports:
        - containerPort: 3306
          name: mysql
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: delivereats-secrets
              key: mysql-root-password
        - name: MYSQL_DATABASE
          value: "auth_db"
        - name: MYSQL_USER
          value: "delivereats"
        - name: MYSQL_PASSWORD
          valueFrom:
            secretKeyRef:
              name: delivereats-secrets
              key: auth-db-password
        volumeMounts:
        - name: auth-db-data
          mountPath: /var/lib/mysql
        - name: init-sql
          mountPath: /docker-entrypoint-initdb.d
        resources:
          requests:
            cpu: 250m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 2Gi
      volumes:
      - name: init-sql
        configMap:
          name: auth-db-init
  volumeClaimTemplates:
  - metadata:
      name: auth-db-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

```powershell
kubectl apply -f k8s/10-auth-db.yaml
kubectl get pods -n delivereats -w  # Esperar hasta que esté Ready
```

### 5.2 Bases de Datos Restantes

Repetir el proceso para:
- `k8s/11-catalog-db.yaml`
- `k8s/12-orders-db.yaml`
- `k8s/13-delivery-db.yaml`

```powershell
kubectl apply -f k8s/11-catalog-db.yaml
kubectl apply -f k8s/12-orders-db.yaml
kubectl apply -f k8s/13-delivery-db.yaml
```

**Verificar:**
```powershell
kubectl get statefulsets -n delivereats
kubectl get pvc -n delivereats  # Verificar PersistentVolumeClaims
```

---

## 6. Despliegue de RabbitMQ

**Archivo:** `k8s/20-rabbitmq.yaml`
```yaml
apiVersion: v1
kind: Service
metadata:
  name: rabbitmq-service
  namespace: delivereats
spec:
  type: ClusterIP
  ports:
  - port: 5672
    targetPort: 5672
    name: amqp
  - port: 15672
    targetPort: 15672
    name: management
  selector:
    app: rabbitmq

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: rabbitmq
  namespace: delivereats
spec:
  serviceName: rabbitmq
  replicas: 1
  selector:
    matchLabels:
      app: rabbitmq
  template:
    metadata:
      labels:
        app: rabbitmq
    spec:
      containers:
      - name: rabbitmq
        image: rabbitmq:3.12-management-alpine
        ports:
        - containerPort: 5672
          name: amqp
        - containerPort: 15672
          name: management
        env:
        - name: RABBITMQ_DEFAULT_USER
          value: "delivereats"
        - name: RABBITMQ_DEFAULT_PASS
          valueFrom:
            secretKeyRef:
              name: delivereats-secrets
              key: rabbitmq-password
        volumeMounts:
        - name: rabbitmq-data
          mountPath: /var/lib/rabbitmq
        resources:
          requests:
            cpu: 200m
            memory: 512Mi
          limits:
            cpu: 500m
            memory: 1Gi
  volumeClaimTemplates:
  - metadata:
      name: rabbitmq-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 5Gi
```

```powershell
kubectl apply -f k8s/20-rabbitmq.yaml
kubectl get pods -n delivereats | Select-String rabbitmq
```

**Acceder al management UI:**
```powershell
kubectl port-forward svc/rabbitmq-service 15672:15672 -n delivereats
# Abrir http://localhost:15672
# Usuario: delivereats
# Password: <tu_rabbitmq_password>
```

---

## 7. Despliegue de Redis

**Archivo:** `k8s/21-redis.yaml`
```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: delivereats
spec:
  type: ClusterIP
  ports:
  - port: 6379
    targetPort: 6379
  selector:
    app: redis

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: delivereats
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
          name: redis
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 250m
            memory: 256Mi
```

```powershell
kubectl apply -f k8s/21-redis.yaml
```

---

## 8. Despliegue de Microservicios

### 8.1 Auth Service

**Archivo:** `k8s/30-auth-service.yaml`
```yaml
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: delivereats
spec:
  type: ClusterIP
  ports:
  - port: 50051
    targetPort: 50051
    protocol: TCP
    name: grpc
  selector:
    app: auth-service

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: delivereats
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
        version: v1.1.0
    spec:
      containers:
      - name: auth-service
        image: docker.io/tu_usuario/delivereats-auth-service:v1.1.0
        ports:
        - containerPort: 50051
          name: grpc
        env:
        - name: NODE_ENV
          value: "production"
        - name: GRPC_PORT
          value: "50051"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: delivereats-secrets
              key: jwt-secret
        - name: DB_HOST
          value: "auth-db-service"
        - name: DB_PORT
          value: "3306"
        - name: DB_NAME
          value: "auth_db"
        - name: DB_USER
          value: "delivereats"
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: delivereats-secrets
              key: auth-db-password
        resources:
          requests:
            cpu: 150m
            memory: 256Mi
          limits:
            cpu: 400m
            memory: 512Mi
        livenessProbe:
          tcpSocket:
            port: 50051
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          tcpSocket:
            port: 50051
          initialDelaySeconds: 10
          periodSeconds: 5

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auth-service-hpa
  namespace: delivereats
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-service
  minReplicas: 2
  maxReplicas: 8
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

```powershell
# Actualizar con tu registry
(Get-Content k8s/30-auth-service.yaml) -replace 'docker.io/tu_usuario', $DOCKER_REGISTRY | Set-Content k8s/30-auth-service.yaml

kubectl apply -f k8s/30-auth-service.yaml
```

### 8.2 Otros Microservicios

Desplegar de manera similar:
```powershell
kubectl apply -f k8s/31-catalog-service.yaml
kubectl apply -f k8s/32-orders-service.yaml
kubectl apply -f k8s/33-delivery-service.yaml
kubectl apply -f k8s/34-notification-service.yaml
```

---

## 9. Despliegue del API Gateway

**Archivo:** `k8s/40-api-gateway.yaml`
```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-service
  namespace: delivereats
spec:
  type: ClusterIP
  ports:
  - port: 3000
    targetPort: 3000
    protocol: TCP
  selector:
    app: api-gateway

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
  namespace: delivereats
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
        version: v1.1.0
    spec:
      containers:
      - name: api-gateway
        image: docker.io/tu_usuario/delivereats-api-gateway:v1.1.0
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: delivereats-secrets
              key: jwt-secret
        - name: AUTH_SERVICE_URL
          value: "auth-service:50051"
        - name: CATALOG_SERVICE_URL
          value: "catalog-service:50052"
        - name: ORDER_SERVICE_URL
          value: "order-service:50053"
        - name: DELIVERY_SERVICE_URL
          value: "delivery-service:50054"
        - name: NOTIFICATION_SERVICE_URL
          value: "notification-service:50055"
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
```

```powershell
kubectl apply -f k8s/40-api-gateway.yaml
```

---

## 10. Despliegue del Frontend

**Archivo:** `k8s/41-frontend.yaml`
```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: delivereats
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 80
  selector:
    app: frontend

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: delivereats
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: docker.io/tu_usuario/delivereats-frontend:v1.1.0
        ports:
        - containerPort: 80
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

```powershell
kubectl apply -f k8s/41-frontend.yaml
```

---

## 11. Configuración del Ingress

### 11.1 Instalar NGINX Ingress Controller

```powershell
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml
```

### 11.2 Crear Ingress Resource

**Archivo:** `k8s/50-ingress.yaml`
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: delivereats-ingress
  namespace: delivereats
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  rules:
  - host: app.delivereats.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
  - host: api.delivereats.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway-service
            port:
              number: 3000
```

```powershell
kubectl apply -f k8s/50-ingress.yaml
```

### 11.3 Obtener IP del Ingress

```powershell
kubectl get ingress -n delivereats
# Esperar hasta que aparezca una ADDRESS (IP externa)
```

### 11.4 Configurar DNS

En tu proveedor de DNS (Google Domains, Cloudflare, etc.), crear registros A:
```
app.delivereats.com → <IP_DEL_INGRESS>
api.delivereats.com → <IP_DEL_INGRESS>
```

---

## 12. Verificación del Despliegue

### 12.1 Verificar Pods

```powershell
kubectl get pods -n delivereats
```

**Salida esperada:**
```
NAME                              READY   STATUS    RESTARTS   AGE
api-gateway-xxxxx                 1/1     Running   0          5m
auth-service-xxxxx                1/1     Running   0          10m
catalog-service-xxxxx             1/1     Running   0          10m
orders-service-xxxxx              1/1     Running   0          10m
...
```

### 12.2 Verificar Servicios

```powershell
kubectl get services -n delivereats
```

### 12.3 Verificar Ingress

```powershell
kubectl describe ingress delivereats-ingress -n delivereats
```

### 12.4 Ver Logs

```powershell
# API Gateway
kubectl logs -n delivereats deployment/api-gateway -f

# Auth Service
kubectl logs -n delivereats deployment/auth-service -f --tail=100

# Orders Service (RabbitMQ Producer)
kubectl logs -n delivereats deployment/order-service -f | Select-String "RabbitMQ"

# Catalog Service (RabbitMQ Consumer)
kubectl logs -n delivereats deployment/catalog-service -f | Select-String "Order received"
```

### 12.5 Probar Endpoints

```powershell
# Health check
curl http://api.delivereats.com/health

# Login
$body = @{
    email = "admin@delivereats.com"
    password = "admin123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://api.delivereats.com/api/auth/login" -Method POST -Body $body -ContentType "application/json"
```

---

## 13. Troubleshooting

### 13.1 Pod No Arranca

```powershell
kubectl describe pod <pod-name> -n delivereats
kubectl logs <pod-name> -n delivereats --previous
```

**Problemas comunes:**
- ImagePullBackOff: Verificar que la imagen existe en el registry
- CrashLoopBackOff: Ver logs para identificar error de aplicación
- Pending: Verificar recursos disponibles en el clúster

### 13.2 Base de Datos No Se Conecta

```powershell
# Verificar que el pod de la BD esté corriendo
kubectl get pods -n delivereats | Select-String "db"

# Conectarse al pod de MySQL
kubectl exec -it auth-db-0 -n delivereats -- mysql -u root -p
# Ingresar password desde el secret

# Dentro de MySQL:
SHOW DATABASES;
USE auth_db;
SHOW TABLES;
SELECT * FROM users;
```

### 13.3 RabbitMQ No Funciona

```powershell
# Port-forward para acceder al management UI
kubectl port-forward svc/rabbitmq-service 15672:15672 -n delivereats

# Abrir http://localhost:15672
# Verificar:
# - Exchanges creados
# - Queues creadas
# - Bindings configurados
# - Mensajes publicados/consumidos
```

### 13.4 Ingress No Funciona

```powershell
# Verificar Ingress Controller
kubectl get pods -n ingress-nginx

# Verificar configuración del Ingress
kubectl describe ingress delivereats-ingress -n delivereats

# Ver logs del Ingress Controller
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller -f
```

---

## 14. Comandos Útiles

### Reiniciar un Deployment
```powershell
kubectl rollout restart deployment/api-gateway -n delivereats
```

### Escalar manualmente
```powershell
kubectl scale deployment api-gateway --replicas=5 -n delivereats
```

### Ver uso de recursos
```powershell
kubectl top pods -n delivereats
kubectl top nodes
```

### Eliminar todo
```powershell
kubectl delete namespace delivereats
```

---

**Fecha de actualización:** 23 de febrero de 2026  
**Versión:** 1.1.0  
**Estado:** Guía completa paso a paso
