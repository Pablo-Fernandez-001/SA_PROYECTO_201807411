# Justificación Técnica — Almacenamiento de Imágenes (Evidencia Fotográfica de Entrega)

## 1. Contexto del Problema

El sistema DeliverEats requiere que los repartidores adjunten una **fotografía como evidencia** al completar una entrega. Esta imagen debe:
- Almacenarse de forma persistente
- Ser consultable por administradores y clientes
- Integrarse con la arquitectura de microservicios existente

## 2. Opciones Evaluadas

### Opción A: Base64 en Base de Datos (MySQL LONGTEXT)
- La imagen se convierte a Base64 y se almacena como texto en la tabla `deliveries`
- Se agrega columna `photo_evidence LONGTEXT` y `photo_content_type VARCHAR(50)`

### Opción B: Sistema de Archivos del Servidor
- Las imágenes se guardan en un directorio del servidor (e.g., `/uploads/photos/`)
- Se almacena la ruta del archivo en la base de datos

### Opción C: Almacenamiento en la Nube (S3, GCS, Azure Blob)
- Las imágenes se suben a un servicio de almacenamiento de objetos
- Se almacena la URL pública/firmada en la base de datos

## 3. Tabla Comparativa

| Criterio | Base64 (MySQL) | FileSystem | Cloud Storage |
|----------|---------------|------------|---------------|
| **Complejidad de implementación** | ⭐ Baja | ⭐⭐ Media | ⭐⭐⭐ Alta |
| **Dependencias externas** | Ninguna | Volúmenes Docker | SDK de cloud |
| **Portabilidad** | ✅ Total | ⚠️ Requiere volumen | ⚠️ Requiere cuenta cloud |
| **Backup automático** | ✅ Con BD | ❌ Separado | ✅ Nativo |
| **Rendimiento (lectura)** | ⚠️ Aceptable para baja escala | ✅ Bueno | ✅ Excelente |
| **Escalabilidad** | ❌ Limitada | ⚠️ Un servidor | ✅ Ilimitada |
| **Costo operativo** | $0 | $0 | $$ Variable |
| **Consistencia transaccional** | ✅ ACID con el registro | ❌ No atómica | ❌ No atómica |
| **Migración/Deploy** | ✅ Solo BD | ⚠️ Configurar volúmenes | ⚠️ Config de credenciales |
| **Apropiado para proyecto universitario** | ✅ Ideal | ✅ Aceptable | ⚠️ Sobre-ingeniería |

## 4. Decisión: Base64 en MySQL (LONGTEXT)

### Justificación

Se eligió **Base64 en MySQL** por las siguientes razones técnicas y contextuales:

#### 4.1 Consistencia Transaccional
Al almacenar la imagen dentro de la misma transacción que actualiza el estado de la entrega, se garantiza **atomicidad ACID**: o se guarda todo (estado + foto) o no se guarda nada. Con filesystem o cloud, existe el riesgo de estados inconsistentes (entrega marcada como completada pero sin foto, o viceversa).

#### 4.2 Simplicidad Arquitectónica
En una arquitectura de microservicios, cada servicio tiene su propia base de datos aislada. Almacenar la imagen en MySQL del delivery-service mantiene el principio de **Database per Service** sin introducir un servicio adicional de almacenamiento.

#### 4.3 Eliminación de Dependencias
- No se requiere configurar volúmenes Docker adicionales
- No se necesita cuenta en servicios cloud (GCS, S3)
- No se introduce un punto de fallo adicional
- El deploy es idéntico en cualquier entorno (local, Docker, cloud)

#### 4.4 Portabilidad y Reproducibilidad
Para un **proyecto universitario** que debe ser evaluado por catedráticos:
- `docker compose up` levanta TODO sin configuración adicional
- Los backups de BD incluyen automáticamente las imágenes
- No hay credenciales de cloud que gestionar
- Cualquier evaluador puede ejecutar el proyecto sin cuentas externas

#### 4.5 Escala apropiada
Para el caso de uso de DeliverEats (evidencia de entrega):
- Las imágenes se comprimen en el cliente antes de enviar
- Se limita a 10MB por imagen
- MySQL LONGTEXT soporta hasta ~4GB por campo
- El volumen esperado (cientos de entregas) no impacta el rendimiento

### Limitaciones Conocidas

1. **Tamaño de base de datos**: Crece más rápido que con referencia a archivos
2. **Overhead de encoding**: Base64 incrementa ~33% el tamaño del dato
3. **No escalable a millones**: Para producción real se recomendaría migrar a cloud storage

### Mitigaciones Implementadas

1. **Body limit**: Configurado a 20MB en Express y API Gateway
2. **Solo 1 foto por entrega**: No se permite galería de múltiples imágenes
3. **Endpoint separado para retorno**: `/api/deliveries/:id/photo` retorna la foto sin incluirla en los listados generales (evita cargar base64 innecesariamente)
4. **Campo `hasPhoto`**: Los listados incluyen un booleano `hasPhoto` que permite saber si existe foto sin transferir el dato

## 5. Implementación Técnica

### 5.1 Modelo de Datos
```sql
ALTER TABLE deliveries
  ADD COLUMN photo_evidence LONGTEXT DEFAULT NULL,
  ADD COLUMN photo_content_type VARCHAR(50) DEFAULT NULL,
  ADD COLUMN failure_reason TEXT DEFAULT NULL;
```

### 5.2 Flujo de Subida
1. Repartidor toma/selecciona foto en frontend
2. Frontend lee archivo con `FileReader.readAsDataURL()`
3. Se extrae base64 (sin el prefijo `data:image/...;base64,`)
4. Se envía en el body: `{ "photo": "<base64>" }`
5. Delivery-service almacena en `photo_evidence` y `photo_content_type`

### 5.3 Flujo de Consulta
1. Frontend solicita `GET /api/deliveries/:id/photo`
2. API Gateway proxy al delivery-service
3. Delivery-service retorna `{ photo: "<base64>", content_type: "image/jpeg" }`
4. Frontend renderiza: `<img src="data:${ct};base64,${photo}" />`

## 6. Conclusión

La elección de Base64 en MySQL es la más **pragmática y apropiada** para este contexto académico, priorizando simplicidad, portabilidad y consistencia transaccional sobre escalabilidad extrema. Para un sistema de producción real con millones de usuarios, se recomendaría migrar a un servicio de almacenamiento de objetos (S3/GCS) con URLs firmadas.
