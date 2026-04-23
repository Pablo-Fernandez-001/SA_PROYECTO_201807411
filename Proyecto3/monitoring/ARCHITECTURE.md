# DeliverEats Observability Architecture

## Objetivo

Esta propuesta adapta la observabilidad de `practicas/practica10` al contexto real de `Proyecto3`, alineada con los requerimientos de Fase 3:

- Logs estructurados centralizados con ELK
- Métricas Prometheus por servicio con `/metrics`
- Dashboards operativos en Grafana y Kibana
- Alertas orientadas a disponibilidad, error rate y latencia p95

## Arquitectura propuesta

### 1. Métricas

- Cada servicio HTTP de DeliverEats expone `/metrics`.
- `auth-service` expone métricas gRPC en `:9101/metrics`.
- Prometheus ya no depende de targets estáticos por ambiente.
- El descubrimiento se hace por anotaciones `prometheus.io/*` sobre Services del namespace `delivereats`.
- Se preserva `node-exporter` para capacidad básica de infraestructura.

### 2. Logs

- Los microservicios Node.js ya emiten JSON con Winston.
- `fx-service` fue ajustado para emitir JSON estructurado.
- Fluent Bit corre como `DaemonSet`, lee `CRI logs`, consulta metadata de Kubernetes y envía a Elasticsearch.
- Los índices diarios usan el prefijo `delivereats-logs-*`, lo que permite retención y análisis por día.

### 3. Visualización

- Grafana queda orientado a SRE/operación:
  - disponibilidad por servicio
  - throughput HTTP
  - error rate 5xx
  - latencia p95 de lectura y escritura
  - métricas gRPC de `auth-service`
  - presión básica de CPU y memoria de nodo
- Kibana queda orientado a troubleshooting:
  - volumen de logs en el tiempo
  - errores por servicio
  - distribución de niveles
  - requests lentos (`duration_ms >= 500`)

### 4. Bootstrap operativo

- Kibana ahora incluye un `Job` que crea automáticamente:
  - data view `delivereats-logs`
  - visualizaciones base
  - dashboard inicial
  - `defaultRoute` apuntando al dashboard

## Justificación técnica

### Por qué no copiar `practicas`

La práctica resolvía un laboratorio con pocos servicios y targets conocidos. En `Proyecto3` eso se queda corto porque:

- el sistema tiene más microservicios y más heterogeneidad técnica
- Fase 3 exige métricas, dashboards y alertas alineadas a SLIs/SLOs
- el proyecto necesita despliegue repetible sin configuración manual posterior

### Decisiones clave

- `kubernetes_sd_configs` en Prometheus:
  evita reescribir targets cuando cambia el número de servicios o puertos.
- Alertas basadas en RNF:
  se usaron los umbrales del proyecto para p95 de lectura, escritura y auth gRPC.
- PVC en Elasticsearch:
  en laboratorio se podía perder historial; en proyecto conviene persistencia mínima.
- RBAC dedicado para Fluent Bit:
  evita depender del `default` service account y mejora trazabilidad operativa.
- Dashboard Grafana por objetivos de negocio técnico:
  se priorizó disponibilidad, latencia, errores y throughput, no solo contadores genéricos.
- Bootstrap automático de Kibana:
  reduce pasos manuales y hace reproducible la solución.

## Configuración principal

### Prometheus

- Archivo base: `monitoring/prometheus/prometheus.yml`
- Manifiesto: `monitoring/prometheus/k8s-prometheus.yaml`
- Jobs:
  - `prometheus`
  - `delivereats-services`
- Alertas:
  - `DeliverEatsServiceDown`
  - `HighHttp5xxRate`
  - `HighReadP95Latency`
  - `HighWriteP95Latency`
  - `HighAuthGrpcP95Latency`

### Grafana

- Datasource provisionado con UID estable `prometheus-delivereats`
- Dashboard:
  - `DeliverEats SRE Overview`
- Archivos:
  - `monitoring/grafana/datasource.yaml`
  - `monitoring/grafana/dashboard-delivereats.json`
  - `monitoring/grafana/k8s-grafana.yaml`

### Kibana y ELK

- Elasticsearch con PVC:
  - `monitoring/elk/elasticsearch.yaml`
- Kibana + bootstrap job:
  - `monitoring/elk/kibana.yaml`
- Fluent Bit con parser CRI y metadata de Kubernetes:
  - `monitoring/elk/fluent-bit.conf`
  - `monitoring/elk/parsers.conf`
  - `monitoring/elk/k8s-fluent-bit.yaml`

## Integración completa

1. Los servicios escriben logs JSON y exponen `/metrics`.
2. Prometheus descubre servicios anotados y recolecta métricas HTTP/gRPC.
3. Grafana provisiona datasource y dashboard sin configuración manual.
4. Fluent Bit recolecta stdout/stderr del clúster y enriquece con metadata de Kubernetes.
5. Elasticsearch almacena índices diarios `delivereats-logs-*`.
6. Kibana crea automáticamente el data view y dashboard inicial mediante `Job`.

## Diferencias clave frente a `practicas`

- `practicas` usaba targets estáticos; `Proyecto3` usa service discovery por anotaciones.
- `practicas` tenía un dashboard simple; `Proyecto3` mide SLIs operativos de Fase 3.
- `practicas` no automatizaba suficientemente Kibana; `Proyecto3` sí bootstrappea data view y dashboard.
- `practicas` no persistía Elasticsearch; `Proyecto3` agrega almacenamiento.
- `practicas` servía a un caso demo; `Proyecto3` se alinea con una plataforma multi-servicio de delivery.

## Relación con el PDF de Fase 3

Se cubren explícitamente los puntos pedidos en `[SA]Proyecto Fase 3.pdf`:

- ELK para logs centralizados y trazabilidad
- Prometheus para `/metrics`
- Grafana para dashboards de uptime, latencia y alertas
- Kibana para errores por microservicio y análisis operativo
- evidencia reproducible mediante YAML y bootstrap automático
