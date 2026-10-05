# Escalabilidad, concurrencia y disponibilidad

## Estado implementado

- Express es **stateless**: no guarda sesiones, locks, cachés de consistencia ni estado de negocio en memoria. PostgreSQL es la fuente de verdad y el refresh token se persiste como hash en `Sesion`.
- `src/infrastructure/prisma.ts` exporta una única instancia de `PrismaClient` por proceso. Controllers, servicios y repositorios la reutilizan; no se crean clientes por solicitud.
- Las listas de equipos, servicios y cuadrillas tienen `pagina` (por defecto `1`) y `limite` (por defecto `25`, máximo `100`). La respuesta es `{ items, pagina, limite, hayMas }`. Se obtiene un registro adicional para calcular `hayMas`, evitando `COUNT(*)` innecesario.
- Los repositorios devuelven DTOs con `select`; no retornan modelos Prisma completos ni usan `include` profundo.
- La restricción parcial `miembros_cuadrilla_par_vigente_unico` y la restricción de un líder vigente protegen membresías concurrentes. El cambio de líder se ejecuta en una transacción corta y maneja conflictos de base de datos.
- `GET /api/health` comprueba que Express responde y `GET /api/ready` consulta PostgreSQL. El proceso admite `HOST` y `PORT`; por defecto escucha en `0.0.0.0`, apto para un load balancer.
- Cada respuesta incluye `x-request-id`. El middleware registra JSON con id, método, ruta, estado y duración; no registra cuerpo, cookies, contraseña, JWT ni `Authorization`.

## Contrato de paginación

Ejemplo: `GET /api/equipos?pagina=2&limite=25`.

```json
{
  "data": {
    "items": [],
    "pagina": 2,
    "limite": 25,
    "hayMas": false
  }
}
```

Para históricos muy extensos (auditoría, notificaciones, historial de órdenes) se debe implementar paginación por cursor antes de exponer sus endpoints. No existen aún módulos HTTP para esas colecciones, por lo que no se inventó un contrato que no pueda probarse.

## Índices revisados

El esquema ya contiene los índices que responden a los filtros previstos:

- `Asignacion`: `ordenId + inicio`, responsables, cuadrilla y autor.
- `OrdenServicio` y `OrdenMaterial`: claves de intervención y catálogo.
- `Notificacion`: `usuarioId + leidaEn + creadaEn` y orden.
- `Auditoria`: `entidad + entidadId + fecha` y `usuarioId + fecha`.

No se añadieron índices adicionales sin una consulta concreta o métricas que los justifiquen.

## Gaps deliberados y evolución necesaria

- No hay módulos de asignaciones, órdenes, auditoría ni notificaciones implementados todavía. Cuando existan, las escrituras críticas deben usar transacciones cortas, restricciones persistentes e idempotencia documentada. No es válido confiar en “consultar y luego insertar”.
- El modelo actual de `Notificacion` no tiene una clave de evento/operación única. Antes de crear notificaciones en reintentos se requiere una migración justificada para una clave de deduplicación persistente, o un `OutboxEvent` transaccional. No se añadió Redis, Kafka, RabbitMQ ni Outbox porque no existen en el proyecto y extender el modelo exige decisión de arquitectura.
- No existe integración S3 ni evidencias implementadas. Los documentos deberán ser privados, guardar solo metadata en PostgreSQL y utilizar URLs temporales; nunca filesystem local ni buckets públicos.
- No existe rate limiting. Debe configurarse en el borde (load balancer/API gateway) o mediante una solución aprobada, con límites definidos a partir de tráfico real, especialmente para autenticación.
- No existe especificación OpenAPI ni suite de carga/concurrencia. Deben añadirse junto con los módulos que expongan sus operaciones, para que documentación y código no diverjan.

## Operación y medición

No se afirma una tasa de requests por segundo ni que el sistema soporte 10,000 solicitudes sin una prueba. La capacidad depende de CPU/RAM, número de instancias, red, PostgreSQL y pool. El presupuesto de conexiones debe ser: `instancias × conexiones máximas por instancia`, dentro de la capacidad real de PostgreSQL; no aumentar el pool arbitrariamente.

Antes de producción, medir escenarios de lectura y escritura con p50/p95/p99, throughput, errores, CPU, memoria y conexiones PostgreSQL. Casos mínimos: listar equipos/servicios, detalle de orden, asignación concurrente, contador/listado de notificaciones y registro masivo de servicios o materiales. Las cargas masivas deben emplear `createMany` o una única transacción cuando el modelo lo permita.
