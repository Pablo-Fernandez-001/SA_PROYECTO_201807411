# Pipeline CI/CD, Flujo JWT y Estrategias de Rollout/Rollback
## DeliverEats - Versión 1.1.0 - Práctica 4

---

## Tabla de Contenidos

1. [Pipeline CI/CD](#1-pipeline-cicd)
2. [Flujo JWT Detallado](#2-flujo-jwt-detallado)
3. [Estrategias de Rollout](#3-estrategias-de-rollout)
4. [Estrategias de Rollback](#4-estrategias-de-rollback)

---

# 1. Pipeline CI/CD

## 1.1 Descripción del Pipeline

El pipeline de CI/CD automatiza el proceso de integración, construcción, pruebas y despliegue de la aplicación DeliverEats en Kubernetes. Utilizamos **GitHub Actions** como herramienta de CI/CD.

### 1.1.1 Stages del Pipeline

```mermaid
graph LR
    A[Push al Repositorio] --> B[Lint & Format]
    B --> C[Unit Tests]
    C --> D[Build Docker Images]
    D --> E[Push to Registry]
    E --> F[Deploy to Dev]
    F --> G{Manual Approval}
    G -->|Approved| H[Deploy to Production]
    G -->|Rejected| I[End]
    H --> I

    style A fill:#e1f5ff
    style B fill:#fff9c4
    style C fill:#fff9c4
    style D fill:#c8e6c9
    style E fill:#c8e6c9
    style F fill:#ffe0b2
    style G fill:#ffccbc
    style H fill:#f8bbd0
    style I fill:#cfd8dc
```

### 1.1.2 Stages Detallados

| Stage | Descripción | Herramientas | Duración Estimada |
|-------|-------------|--------------|-------------------|
| **1. Lint & Format** | Validar código con ESLint/Prettier | ESLint, Prettier | ~2 min |
| **2. Unit Tests** | Ejecutar tests unitarios | Jest, Mocha | ~5 min |
| **3. Build Docker Images** | Construir imágenes de cada microservicio | Docker Buildx | ~10 min |
| **4. Push to Registry** | Subir imágenes a Docker Hub/GCR | Docker CLI | ~5 min |
| **5. Deploy to Dev** | Desplegar automáticamente a ambiente de desarrollo | kubectl | ~3 min |
| **6. Manual Approval** | Esperar aprobación manual para producción | GitHub Environments | Variable |
| **7. Deploy to Production** | Desplegar a producción con Rolling Update | kubectl | ~5 min |

**Tiempo total:** 25-30 minutos (sin contar aprobación manual)

---

## 1.2 Configuración de GitHub Actions

### 1.2.1 Archivo de Workflow

**Ruta:** `.github/workflows/ci-cd.yml`

```yaml
name: DeliverEats CI/CD Pipeline

on:
  push:
    branches:
      - main
      - develop
  pull_request:
    branches:
      - main

env:
  DOCKER_REGISTRY: docker.io/${{ secrets.DOCKER_USERNAME }}
  GKE_CLUSTER: delivereats-cluster
  GKE_ZONE: us-central1-a
  GKE_PROJECT: ${{ secrets.GCP_PROJECT_ID }}
  IMAGE_TAG: ${{ github.sha }}

jobs:
  # ===========================
  # JOB 1: Lint and Format
  # ===========================
  lint:
    name: Lint & Format Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci
        working-directory: ./api-gateway

      - name: Run ESLint
        run: npm run lint
        working-directory: ./api-gateway

      - name: Check code formatting
        run: npm run format:check
        working-directory: ./api-gateway

  # ===========================
  # JOB 2: Unit Tests
  # ===========================
  test:
    name: Run Unit Tests
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd api-gateway && npm ci
          cd ../auth-service && npm ci
          cd ../catalog-service && npm ci
          cd ../orders-service && npm ci

      - name: Run tests
        run: |
          cd api-gateway && npm test -- --coverage
          cd ../auth-service && npm test -- --coverage
          cd ../catalog-service && npm test -- --coverage
          cd ../orders-service && npm test -- --coverage

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  # ===========================
  # JOB 3: Build Docker Images
  # ===========================
  build:
    name: Build Docker Images
    runs-on: ubuntu-latest
    needs: test
    strategy:
      matrix:
        service:
          - api-gateway
          - auth-service
          - catalog-service
          - orders-service
          - delivery-service
          - notification-service
          - frontend
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push ${{ matrix.service }}
        uses: docker/build-push-action@v4
        with:
          context: ./${{ matrix.service }}
          push: true
          tags: |
            ${{ env.DOCKER_REGISTRY }}/delivereats-${{ matrix.service }}:${{ env.IMAGE_TAG }}
            ${{ env.DOCKER_REGISTRY }}/delivereats-${{ matrix.service }}:latest
          cache-from: type=registry,ref=${{ env.DOCKER_REGISTRY }}/delivereats-${{ matrix.service }}:buildcache
          cache-to: type=registry,ref=${{ env.DOCKER_REGISTRY }}/delivereats-${{ matrix.service }}:buildcache,mode=max

  # ===========================
  # JOB 4: Deploy to Development
  # ===========================
  deploy-dev:
    name: Deploy to Development
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment:
      name: development
      url: https://dev.delivereats.com
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Setup Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Get GKE credentials
        run: |
          gcloud container clusters get-credentials ${{ env.GKE_CLUSTER }} \
            --zone ${{ env.GKE_ZONE }} \
            --project ${{ env.GKE_PROJECT }}

      - name: Update deployments with new images
        run: |
          kubectl set image deployment/api-gateway \
            api-gateway=${{ env.DOCKER_REGISTRY }}/delivereats-api-gateway:${{ env.IMAGE_TAG }} \
            -n delivereats-dev
          
          kubectl set image deployment/auth-service \
            auth-service=${{ env.DOCKER_REGISTRY }}/delivereats-auth-service:${{ env.IMAGE_TAG }} \
            -n delivereats-dev
          
          kubectl set image deployment/catalog-service \
            catalog-service=${{ env.DOCKER_REGISTRY }}/delivereats-catalog-service:${{ env.IMAGE_TAG }} \
            -n delivereats-dev
          
          kubectl set image deployment/order-service \
            order-service=${{ env.DOCKER_REGISTRY }}/delivereats-orders-service:${{ env.IMAGE_TAG }} \
            -n delivereats-dev

      - name: Wait for rollout to complete
        run: |
          kubectl rollout status deployment/api-gateway -n delivereats-dev --timeout=5m
          kubectl rollout status deployment/auth-service -n delivereats-dev --timeout=5m
          kubectl rollout status deployment/catalog-service -n delivereats-dev --timeout=5m
          kubectl rollout status deployment/order-service -n delivereats-dev --timeout=5m

      - name: Verify deployment
        run: |
          kubectl get pods -n delivereats-dev
          kubectl get services -n delivereats-dev

  # ===========================
  # JOB 5: Deploy to Production
  # ===========================
  deploy-prod:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://delivereats.com
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Setup Cloud SDK
        uses: google-github-actions/setup-gcloud@v1

      - name: Get GKE credentials
        run: |
          gcloud container clusters get-credentials ${{ env.GKE_CLUSTER }} \
            --zone ${{ env.GKE_ZONE }} \
            --project ${{ env.GKE_PROJECT }}

      - name: Update deployments with new images (Rolling Update)
        run: |
          kubectl set image deployment/api-gateway \
            api-gateway=${{ env.DOCKER_REGISTRY }}/delivereats-api-gateway:${{ env.IMAGE_TAG }} \
            -n delivereats
          
          kubectl set image deployment/auth-service \
            auth-service=${{ env.DOCKER_REGISTRY }}/delivereats-auth-service:${{ env.IMAGE_TAG }} \
            -n delivereats
          
          kubectl set image deployment/catalog-service \
            catalog-service=${{ env.DOCKER_REGISTRY }}/delivereats-catalog-service:${{ env.IMAGE_TAG }} \
            -n delivereats
          
          kubectl set image deployment/order-service \
            order-service=${{ env.DOCKER_REGISTRY }}/delivereats-orders-service:${{ env.IMAGE_TAG }} \
            -n delivereats

      - name: Wait for rollout to complete
        run: |
          kubectl rollout status deployment/api-gateway -n delivereats --timeout=5m
          kubectl rollout status deployment/auth-service -n delivereats --timeout=5m
          kubectl rollout status deployment/catalog-service -n delivereats --timeout=5m
          kubectl rollout status deployment/order-service -n delivereats --timeout=5m

      - name: Run smoke tests
        run: |
          curl -f https://api.delivereats.com/health || exit 1
          echo "Smoke tests passed!"

      - name: Notify deployment success
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: '🚀 Production deployment successful!'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: success()

      - name: Notify deployment failure
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: '❌ Production deployment failed!'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: failure()
```

---

## 1.3 Variables y Secrets Necesarios

### 1.3.1 GitHub Secrets

Configurar en: `Settings > Secrets and variables > Actions`

| Secret Name | Descripción | Ejemplo |
|-------------|-------------|---------|
| `DOCKER_USERNAME` | Usuario de Docker Hub | `tu_usuario` |
| `DOCKER_PASSWORD` | Password o Access Token de Docker Hub | `dckr_pat_abc123...` |
| `GCP_PROJECT_ID` | ID del proyecto de GCP | `delivereats-proyecto` |
| `GCP_SA_KEY` | JSON de Service Account de GCP | `{ "type": "service_account", ... }` |
| `JWT_SECRET` | Secret para firmar JWT | `mi_super_secreto_2026` |
| `SLACK_WEBHOOK` | Webhook de Slack para notificaciones | `https://hooks.slack.com/...` |

### 1.3.2 GitHub Environments

Crear dos environments en: `Settings > Environments`

**Development:**
- Name: `development`
- URL: `https://dev.delivereats.com`
- Protection rules: None (despliegue automático)

**Production:**
- Name: `production`
- URL: `https://delivereats.com`
- Protection rules:
  - ✅ Required reviewers (1-2 personas)
  - ✅ Wait timer: 5 minutes (opcional)
  - ✅ Deployment branches: only `main`

---

## 1.4 Triggers del Pipeline

### 1.4.1 Push a Ramas

```yaml
on:
  push:
    branches:
      - main       # Trigger deploy a producción (con aprobación)
      - develop    # Trigger deploy a desarrollo (automático)
```

### 1.4.2 Pull Requests

```yaml
on:
  pull_request:
    branches:
      - main  # Solo ejecuta lint y tests, no deploy
```

### 1.4.3 Manual Triggering

```yaml
on:
  workflow_dispatch:  # Permite ejecutar manualmente desde GitHub UI
```

---

## 1.5 Diagrama del Pipeline

```mermaid
sequenceDiagram
    actor Dev as 👨‍💻 Developer
    participant GH as GitHub Repo
    participant GA as GitHub Actions
    participant DR as Docker Registry
    participant K8S as Kubernetes (GKE)
    participant PROD as Production

    Dev->>GH: git push origin develop
    GH->>GA: Trigger CI/CD workflow
    
    Note over GA: Stage 1: Lint & Format
    GA->>GA: ESLint + Prettier check
    
    Note over GA: Stage 2: Unit Tests
    GA->>GA: npm test (Jest)
    
    Note over GA: Stage 3: Build Docker Images
    GA->>GA: docker build (7 servicios)
    
    Note over GA: Stage 4: Push to Registry
    GA->>DR: docker push (tagged images)
    DR-->>GA: Push successful
    
    Note over GA,K8S: Stage 5: Deploy to Dev
    GA->>K8S: kubectl set image (dev namespace)
    K8S->>K8S: Rolling update pods
    K8S-->>GA: Deployment successful
    
    Note over GA: Stage 6: Merge to main
    Dev->>GH: Create PR (develop → main)
    Dev->>GH: Merge PR
    GH->>GA: Trigger production deployment
    
    Note over GA: Stage 7: Manual Approval
    GA->>Dev: Request approval (GitHub Environment)
    Dev->>GA: Approve deployment
    
    Note over GA,PROD: Stage 8: Deploy to Production
    GA->>K8S: kubectl set image (prod namespace)
    K8S->>K8S: Rolling update with health checks
    K8S-->>GA: Deployment successful
    GA->>Dev: ✅ Deployment complete notification
```

---

# 2. Flujo JWT Detallado

## 2.1 Descripción del JWT

**JWT (JSON Web Token)** es un estándar abierto (RFC 7519) que define una forma compacta y autónoma de transmitir información de manera segura entre partes como un objeto JSON.

### 2.1.1 Estructura del JWT

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhYmMxMjMiLCJlbWFpbCI6InVzZXJAZW1haWwuY29tIiwicm9sZSI6IkNMSUVOVEUiLCJpYXQiOjE2Nzc2NzIwMDAsImV4cCI6MTY3Nzc1ODQwMH0.tKzYxHvBHUqKw5RjcYvYzj-pZr0hTmPz9P8GvNqJ9Rk
```

**Partes:**
1. **Header** (Algoritmo y tipo)
2. **Payload** (Datos del usuario)
3. **Signature** (Firma digital)

---

## 2.2 Generación de JWT (Login)

### 2.2.1 Proceso de Login

```mermaid
sequenceDiagram
    actor Usuario as 👤 Usuario
    participant FE as Frontend
    participant GW as API Gateway
    participant AUTH as Auth Service
    participant DB as Auth DB

    Usuario->>FE: Ingresa email y password
    FE->>GW: POST /api/auth/login<br/>{ email, password }
    
    GW->>AUTH: Login(email, password) [gRPC]
    
    AUTH->>DB: SELECT * FROM users<br/>WHERE email = ?
    DB-->>AUTH: User {id, email, password_hash, role}
    
    alt Usuario no encontrado
        AUTH-->>GW: Error 401: Usuario no encontrado
        GW-->>FE: 401 Unauthorized
        FE-->>Usuario: ❌ Credenciales inválidas
    else Usuario encontrado
        AUTH->>AUTH: bcrypt.compare(password, password_hash)
        
        alt Contraseña incorrecta
            AUTH-->>GW: Error 401: Contraseña incorrecta
            GW-->>FE: 401 Unauthorized
            FE-->>Usuario: ❌ Credenciales inválidas
        else Contraseña correcta
            Note over AUTH: Generar JWT
            AUTH->>AUTH: jwt.sign({<br/>  userId,<br/>  email,<br/>  role<br/>}, JWT_SECRET, {<br/>  expiresIn: '24h'<br/>})
            
            AUTH-->>GW: { token, user }
            GW-->>FE: 200 OK<br/>{ token, user }
            FE->>FE: localStorage.setItem('token', token)
            FE-->>Usuario: ✅ Bienvenido!<br/>Redirigir a /home
        end
    end
```

### 2.2.2 Código de Generación (JavaScript)

```javascript
// auth-service/src/utils/jwtUtils.js
const jwt = require('jsonwebtoken');

function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const options = {
    expiresIn: '24h',  // Token válido por 24 horas
    issuer: 'delivereats-auth-service',
    audience: 'delivereats-api'
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, options);
  
  return token;
}

module.exports = { generateToken };
```

**Ejemplo de Token generado:**
```json
{
  "userId": "abc-123-def",
  "email": "juan@email.com",
  "role": "CLIENTE",
  "iat": 1677672000,
  "exp": 1677758400,
  "iss": "delivereats-auth-service",
  "aud": "delivereats-api"
}
```

---

## 2.3 Validación de JWT (Peticiones Protegidas)

### 2.3.1 Proceso de Validación

```mermaid
sequenceDiagram
    actor Usuario as 👤 Usuario
    participant FE as Frontend
    participant GW as API Gateway
    participant ORD as Order Service

    Usuario->>FE: Crear orden
    FE->>FE: token = localStorage.getItem('token')
    FE->>GW: POST /api/orders<br/>Authorization: Bearer <token>
    
    GW->>GW: Extraer token del header
    GW->>GW: jwt.verify(token, JWT_SECRET)
    
    alt Token inválido o expirado
        GW-->>FE: 401 Unauthorized<br/>{ error: "Token inválido" }
        FE->>FE: localStorage.removeItem('token')
        FE-->>Usuario: ❌ Sesión expirada<br/>Redirigir a /login
    else Token válido
        GW->>GW: Extraer payload {userId, email, role}
        
        Note over GW: Verificar autorización por rol
        alt Rol no autorizado
            GW-->>FE: 403 Forbidden<br/>{ error: "No autorizado para esta acción" }
            FE-->>Usuario: ❌ No tienes permisos
        else Rol autorizado
            GW->>ORD: CreateOrder(userId, ...) [gRPC]
            ORD->>ORD: Procesar orden
            ORD-->>GW: OrderResponse
            GW-->>FE: 201 Created<br/>{ order }
            FE-->>Usuario: ✅ Orden creada exitosamente
        end
    end
```

### 2.3.2 Middleware de Validación en API Gateway

```javascript
// api-gateway/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

function authenticateJWT(req, res, next) {
  // 1. Extraer token del header Authorization
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1]; // "Bearer <token>"
  
  if (!token) {
    return res.status(401).json({ error: 'Formato de token inválido' });
  }

  try {
    // 2. Verificar y decodificar el token
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. Adjuntar información del usuario al request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    };
    
    // 4. Continuar al siguiente middleware/ruta
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    return res.status(500).json({ error: 'Error al validar token' });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'No autorizado', 
        message: `Se requiere rol: ${allowedRoles.join(' o ')}` 
      });
    }
    
    next();
  };
}

module.exports = { authenticateJWT, authorizeRoles };
```

### 2.3.3 Uso en Rutas

```javascript
// api-gateway/src/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateJWT, authorizeRoles } = require('../middleware/authMiddleware');
const orderController = require('../controllers/orderController');

// Crear orden: Solo CLIENTE
router.post('/orders', 
  authenticateJWT, 
  authorizeRoles('CLIENTE'), 
  orderController.createOrder
);

// Aceptar orden: Solo RESTAURANTE
router.put('/orders/:id/accept', 
  authenticateJWT, 
  authorizeRoles('RESTAURANTE'), 
  orderController.acceptOrder
);

// Ver todas las órdenes: Solo ADMIN
router.get('/orders/all', 
  authenticateJWT, 
  authorizeRoles('ADMIN'), 
  orderController.getAllOrders
);

module.exports = router;
```

---

## 2.4 Ejemplo de Peticiones con JWT

### 2.4.1 Login

**Request:**
```http
POST https://api.delivereats.com/api/auth/login
Content-Type: application/json

{
  "email": "juan@email.com",
  "password": "miPassword123"
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhYmMtMTIzLWRlZiIsImVtYWlsIjoianVhbkBlbWFpbC5jb20iLCJyb2xlIjoiQ0xJRU5URSIsImlhdCI6MTY3NzY3MjAwMCwiZXhwIjoxNjc3NzU4NDAwfQ.tKzYxHvBHUqKw5RjcYvYzj-pZr0hTmPz9P8GvNqJ9Rk",
  "user": {
    "id": "abc-123-def",
    "name": "Juan Pérez",
    "email": "juan@email.com",
    "role": "CLIENTE"
  }
}
```

### 2.4.2 Crear Orden (con JWT)

**Request:**
```http
POST https://api.delivereats.com/api/orders
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "restaurantId": "rest-001",
  "items": [
    { "itemId": "item-001", "quantity": 2 },
    { "itemId": "item-002", "quantity": 1 }
  ],
  "deliveryAddress": "Calle Principal 789"
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "orderId": "order-456",
  "total": 390.00,
  "status": "CREADA"
}
```

### 2.4.3 Error: Token Expirado

**Request:**
```http
GET https://api.delivereats.com/api/orders/order-456
Authorization: Bearer <token_expirado>
```

**Response:**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": "Token expirado",
  "message": "Tu sesión ha expirado. Por favor inicia sesión nuevamente."
}
```

---

# 3. Estrategias de Rollout

## 3.1 Rolling Update (Predeterminada)

### 3.1.1 Descripción

**Rolling Update** es la estrategia predeterminada de Kubernetes. Actualiza gradualmente los pods uno a uno, garantizando cero downtime.

**Configuración:**
```yaml
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Máximo 1 pod adicional durante actualización
      maxUnavailable: 0  # Garantizar 0 pods no disponibles (cero downtime)
```

### 3.1.2 Proceso

```mermaid
sequenceDiagram
    participant K8S as Kubernetes
    participant OLD1 as Pod v1.0.0 (1)
    participant OLD2 as Pod v1.0.0 (2)
    participant OLD3 as Pod v1.0.0 (3)
    participant NEW1 as Pod v1.1.0 (1)
    participant NEW2 as Pod v1.1.0 (2)
    participant NEW3 as Pod v1.1.0 (3)

    Note over K8S,OLD3: Estado inicial: 3 pods v1.0.0

    K8S->>NEW1: Crear nuevo pod v1.1.0
    NEW1->>K8S: Pod creado, esperando health check
    NEW1->>K8S: ✅ Readiness Probe OK
    
    K8S->>OLD1: Terminar pod v1.0.0 (1)
    OLD1->>K8S: Pod terminado
    
    Note over K8S: 2 pods v1.0.0, 1 pod v1.1.0
    
    K8S->>NEW2: Crear nuevo pod v1.1.0
    NEW2->>K8S: ✅ Readiness Probe OK
    K8S->>OLD2: Terminar pod v1.0.0 (2)
    
    Note over K8S: 1 pod v1.0.0, 2 pods v1.1.0
    
    K8S->>NEW3: Crear nuevo pod v1.1.0
    NEW3->>K8S: ✅ Readiness Probe OK
    K8S->>OLD3: Terminar pod v1.0.0 (3)
    
    Note over K8S,NEW3: ✅ Rollout completo: 3 pods v1.1.0
```

### 3.1.3 Ventajas y Desventajas

| Ventajas | Desventajas |
|----------|-------------|
| ✅ Cero downtime | ❌ Actualización gradual (más lento) |
| ✅ Rollback fácil | ❌ Convivencia temporal de 2 versiones |
| ✅ Usa health checks automáticamente | ❌ Problemas de compatibilidad entre versiones |
| ✅ Estrategia predeterminada | |

### 3.1.4 Comando de Despliegue

```powershell
# Actualizar imagen
kubectl set image deployment/api-gateway api-gateway=docker.io/tu_usuario/delivereats-api-gateway:v1.1.0 -n delivereats

# Ver estado del rollout
kubectl rollout status deployment/api-gateway -n delivereats

# Ver historial de rollouts
kubectl rollout history deployment/api-gateway -n delivereats
```

---

## 3.2 Recreate (No Recomendada)

### 3.2.1 Descripción

Elimina todos los pods antiguos antes de crear los nuevos. **Causa downtime**.

**Configuración:**
```yaml
spec:
  strategy:
    type: Recreate
```

**Proceso:**
1. Eliminar todos los pods v1.0.0
2. Esperar a que terminen
3. Crear todos los pods v1.1.0
4. Esperar health checks

**Downtime:** 30 segundos - 2 minutos

---

## 3.3 Blue-Green Deployment (Manual)

### 3.3.1 Descripción

Mantener dos ambientes completos (Blue y Green) y cambiar el tráfico instantáneamente.

**Proceso:**
```powershell
# 1. Desplegar versión Green
kubectl apply -f deployment-green-v1.1.0.yaml

# 2. Esperar que todos los pods estén ready
kubectl wait --for=condition=ready pod -l version=v1.1.0 -n delivereats

# 3. Cambiar Service para apuntar a Green
kubectl patch service api-gateway-service -p '{"spec":{"selector":{"version":"v1.1.0"}}}' -n delivereats

# 4. Validar funcionamiento
curl https://api.delivereats.com/health

# 5. Eliminar versión Blue después de validar
kubectl delete deployment api-gateway-blue -n delivereats
```

---

## 3.4 Canary Deployment

### 3.4.1 Descripción

Desplegar la nueva versión a un pequeño porcentaje de usuarios (5-10%) y aumentar gradualmente si todo va bien.

**Usando Istio o NGINX Ingress con canary:**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: delivereats-ingress-canary
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "10"  # 10% del tráfico
spec:
  rules:
  - host: api.delivereats.com
    http:
      paths:
      - path: /
        backend:
          service:
            name: api-gateway-v1.1.0
            port:
              number: 3000
```

---

# 4. Estrategias de Rollback

## 4.1 Rollback Manual

### 4.1.1 Revertir a la Versión Anterior

```powershell
# Rollback inmediato a la revisión anterior
kubectl rollout undo deployment/api-gateway -n delivereats

# Ver el progreso del rollback
kubectl rollout status deployment/api-gateway -n delivereats
```

**Salida:**
```
Waiting for deployment "api-gateway" rollout to finish: 1 out of 3 new replicas have been updated...
Waiting for deployment "api-gateway" rollout to finish: 2 out of 3 new replicas have been updated...
Waiting for deployment "api-gateway" rollout to finish: 3 out of 3 new replicas have been updated...
deployment "api-gateway" successfully rolled out
```

### 4.1.2 Revertir a una Revisión Específica

```powershell
# Ver historial completo
kubectl rollout history deployment/api-gateway -n delivereats

# Salida:
# REVISION  CHANGE-CAUSE
# 1         Initial deployment
# 2         Update to v1.0.1
# 3         Update to v1.1.0
# 4         Update to v1.2.0 (current - broken)

# Revertir a revisión 3 (v1.1.0)
kubectl rollout undo deployment/api-gateway -n delivereats --to-revision=3
```

---

## 4.2 Rollback Automático

### 4.2.1 Configuración con Health Checks

Los health checks de Kubernetes detectan automáticamente pods que fallan y no envían tráfico, pero no revierten automáticamente el deployment.

**Configuración de Probes:**
```yaml
spec:
  template:
    spec:
      containers:
      - name: api-gateway
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          failureThreshold: 3  # Falla después de 3 intentos
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          failureThreshold: 3
```

**Comportamiento:**
- Si un pod nuevo falla el `readinessProbe`, Kubernetes no envía tráfico a ese pod
- Si todos los pods nuevos fallan, el tráfico sigue yendo a los pods antiguos (todavía corriendo gracias a `maxUnavailable: 0`)
- Rollback manual requerido si se detecta que la nueva versión es problemática

---

## 4.3 Tiempo de Rollback

| Estrategia | Tiempo de Rollback |
|------------|-------------------|
| Rolling Update | 2-5 minutos |
| Blue-Green | 10 segundos (cambio de Service) |
| Recreate | 30 segundos - 2 minutos |

---

## 4.4 Ejemplo Completo de Rollback en Caso de Emergencia

```powershell
# 1. Detectar problema en producción
kubectl get pods -n delivereats | findstr api-gateway
# Salida: api-gateway-abc-123  0/1  CrashLoopBackOff

# 2. Ver logs del pod problemático
kubectl logs api-gateway-abc-123 -n delivereats

# 3. Si el problema es crítico, hacer rollback inmediato
kubectl rollout undo deployment/api-gateway -n delivereats

# 4. Monitorear el rollback
kubectl rollout status deployment/api-gateway -n delivereats

# 5. Verificar que la aplicación funcione
curl https://api.delivereats.com/health

# 6. Notificar al equipo
echo "Rollback executed successfully. Incident under investigation."
```

---

**Fecha de actualización:** 23 de febrero de 2026  
**Versión:** 1.1.0  
**Estado:** Documentación completa
