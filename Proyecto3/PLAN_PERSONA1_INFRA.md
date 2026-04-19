# Persona 1 — Plan de Infraestructura y Kubernetes

> Contexto: Proyecto Fase 2 exige despliegue completo en nube, K8s productivo, CI/CD, colas y nuevos microservicios (payment, fx, ratings, evidencia). Este plan delimita las tareas exclusivas para la rama `feature/k8s-infra`.

## 1. Objetivos inmediatos
- **Orquestar todos los componentes** (frontend, api-gateway, auth, catalog, orders, delivery, notification, payment, fx, rabbitmq, redis, mysql pods) bajo un `Namespace` único p.ej. `delivereats`.
- **Garantizar configuración declarativa**: `ConfigMaps` para settings no sensibles, `Secrets` para JWT, credenciales DB, llaves externas y API FX.
- **Proveer networking interno seguro**: `Services` tipo `ClusterIP` y un único `Ingress` HTTP/S con reglas por hostname/path.
- **Persistencia**: Volúmenes persistentes (PVC) para cada base de datos MySQL y para evidencia fotográfica en delivery-service.
- **Observabilidad mínima**: readiness/liveness probes y labels que faciliten monitoreo desde la pipeline (persona 2).

## 2. Árbol esperado en `/k8s`
```
k8s/
  00-namespace.yaml
  01-secrets.yaml
  02-configmaps.yaml
  05-storage-
     auth-db.yaml
     catalog-db.yaml
     orders-db.yaml
     delivery-db.yaml
     payment-db.yaml
  10-rabbitmq.yaml
  11-redis.yaml
  20-auth-service.yaml
  21-catalog-service.yaml
  22-orders-service.yaml
  23-delivery-service.yaml
  24-notification-service.yaml
  25-payment-service.yaml
  26-fx-service.yaml
  27-api-gateway.yaml
  28-frontend.yaml
  50-ingress.yaml
```
Ajustar números si se necesitan más manifestos (p.ej. `image-storage`).

## 3. Tareas detalladas
1. **Namespace & RBAC mínimo**
   - Crear `Namespace delivereats`.
   - (Opcional) Definir `ServiceAccount` + `RoleBinding` para despliegues automatizados.

2. **Secrets críticos**
   - `JWT_SECRET`, credenciales MySQL, llaves API FX, credenciales Redis/RabbitMQ si aplican.
   - Utilizar `stringData` y referenciarlos en los Deployments via `envFrom`/`env`.

3. **ConfigMaps**
   - Variables: `SERVICE_URLS`, `PORTS`, `RABBITMQ_QUEUE`, `REDIS_URL`, `FX_BASE_URL`, flags de `NODE_ENV`, etc.
   - Mantener claves alineadas con `.env.docker` actuales para reducir cambios en código.

4. **Persistencia**
   - Crear `StorageClass` si el cluster no trae una por defecto (documentar supuestos).
   - Definir `PVC` + `PV` para cada DB. Para evidencia fotográfica usar PVC montado en delivery-service (p.ej. `/evidence`).

5. **Broker y Cache**
   - RabbitMQ y Redis como `StatefulSet` o `Deployment` + `PVC` (según necesidad).
   - Exponer `Services` internos.

6. **Microservicios**
   - Cada servicio como `Deployment` con:
     - `resources.requests/limits` iniciales.
     - `readinessProbe` (HTTP o TCP) y `livenessProbe`.
     - `envFrom` para ConfigMap + Secrets.
     - `image: ghcr.io/<repo>/<service>:{{ github.sha }}` para alinear con CI/CD (persona 2).
   - `Service` tipo `ClusterIP` por microservicio.

7. **API Gateway & Frontend**
   - Gateway con `Service` `ClusterIP` (puerto 8080) y anotaciones necesarias para rate limiting si aplica.
   - Frontend con `Service` y `Ingress` exponiendo `/`.

8. **Ingress**
   - Host recomendado: `delivereats.<dominio>`.
   - Rutas:
     - `/` → frontend
     - `/api/*` → api-gateway
     - `/evidence/*` → delivery-service si expone archivos.
   - TLS opcional (documentar si queda pendiente para pipeline).

9. **Documentación**
   - Añadir sección en `docs/ARQUITECTURA.md` describiendo topología K8s + comandos de despliegue.
   - Evidencia: capturas `kubectl get pods -n delivereats` y `kubectl describe ingress` para calificación.

## 4. Integraciones con otras ramas
- **Business core**: definir `ConfigMap` placeholders para nuevos endpoints (payment, fx, ratings) para no bloquearlos.
- **CI/CD**: acordar con persona 2 variables y nombres de imágenes. Proveer `kubeconfig` path y namespace final.

## 5. Validaciones previas a merge
- `kubectl apply -f k8s/ --dry-run=client`.
- `kubectl get all -n delivereats` sin pods en CrashLoop.
- Prueba de red: `kubectl run curl --rm -i --tty --image=curlimages/curl -n delivereats -- curl http://api-gateway:8080/health`.
- Comprobar montaje de PVC con `kubectl exec` a cada DB.

## 6. Pendientes / Riesgos
- Definir proveedor de almacenamiento (GKE, AKS, etc.). Documentar si se usa `hostPath` solo para pruebas.
- TLS requiere certificado válido; coordinar con CI/CD para automatizar `cert-manager` o subir manual.
- Costo de recursos en nube: evaluar `requests` pequeños para no exceder cuotas.

## 7. Prerrequisitos del clúster y comandos base
- Registrar versión mínima de Kubernetes (>=1.28), StorageClass disponible y tipo de ingress controller (Nginx, GKE, etc.).
- Documentar cómo obtener credenciales (`az aks get-credentials`, `gcloud container clusters get-credentials`, etc.) y path de `kubeconfig` consumido por los manifiestos.
- Dejar en `docs/ARQUITECTURA.md` los comandos de operación básicos:
  - `kubectl apply -k k8s/` o `kubectl apply -f k8s/`.
  - `kubectl get pods -n delivereats`, `kubectl describe ingress delivereats -n delivereats`.
  - Procedimiento de limpieza (`kubectl delete namespace delivereats`).

## 8. Artefactos auxiliares a preparar
1. **Plantillas de Secrets/ConfigMaps**
   - Crear archivos `.template` o comentarios dentro de `01-secrets.yaml` y `02-configmaps.yaml` con claves `FAKE_...` aclarando quién debe reemplazarlas (persona 2 para pipeline, persona 3 para llaves externas).
   - Respetar nombres de variables actuales (`AUTH_DB_HOST`, `PAYMENT_PROVIDER_KEY`, etc.) para no modificar código.

2. **Tabla de puertos y dependencias**
   - Incluir en este plan (o en `docs/ARQUITECTURA.md`) la siguiente tabla para guiar a otras ramas:

| Servicio             | Puerto interno | Service (DNS)       | Depende de |
| -------------------- | -------------- | ------------------- | ---------- |
| api-gateway          | 8080           | `api-gateway`       | auth, catalog, orders, delivery, payment |
| auth-service         | 50051          | `auth-service`      | auth-db |
| catalog-service      | 3002 / 50052   | `catalog-service`   | catalog-db, rabbitmq |
| orders-service       | 3003           | `orders-service`    | orders-db, rabbitmq, catalog-service |
| delivery-service     | 3004           | `delivery-service`  | delivery-db, rabbitmq |
| payment-service      | 3005           | `payment-service`   | payment-db, fx-service |
| fx-service           | 4000           | `fx-service`        | redis, API externa |
| frontend             | 3000           | `frontend`          | api-gateway |

3. **Convenciones de imágenes**
   - Definir en el README la forma oficial de las imágenes: `ghcr.io/sa-proyecto/<servicio>:<sha>`.
   - Publicar en este plan las variables de entorno mínimas que cada Deployment expondrá para que CI/CD solo consuma la lista (p.ej., `AUTH_SERVICE_IMAGE`, `CATALOG_SERVICE_IMAGE`).

4. **Estrategia temporal de almacenamiento local**
   - Si se usa `hostPath` para pruebas, documentar el plan de migración a PVC reales (p.ej., `hostPath` solo en entorno dev y `PersistentVolumeClaim` en prod) y qué comandos ejecutar para mover datos.
- Señalar qué volúmenes deben existir antes del despliegue (por ejemplo, snapshots de datos semilla para las BDs).

---
Este archivo sirve como checklist vivo para la rama `feature/k8s-infra`. Actualizar conforme se cierren tareas o surjan dependencias adicionales.
