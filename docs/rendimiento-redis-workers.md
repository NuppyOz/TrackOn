# Rendimiento: Redis y worker threads

## Caché Redis

TrackOn aplica cache-aside a las lecturas con mayor repetición:

- listados y detalles de órdenes: TTL de 30 segundos;
- resumen del dashboard: TTL de 20 segundos.

Las claves incluyen una versión por dominio. Una mutación exitosa de órdenes
incrementa las versiones de `ordenes` y `dashboard`; los cambios de cuadrillas
invalidan el dashboard. Esto evita usar `KEYS` o borrar claves por patrones en el
camino de cada solicitud. Las versiones anteriores desaparecen por TTL.

PostgreSQL sigue siendo la fuente de verdad. Si Redis no está configurado o no
responde, la API continúa con la consulta normal. `/api/ready` informa `cache`
como `connected`, `disabled` o `unavailable` sin declarar caída total de la API.

Redis se limita a 128 MB y usa `allkeys-lru`. La caché no tiene volumen porque
puede reconstruirse desde PostgreSQL.

## Worker threads

El hash SHA-256 de evidencias se calcula en un pool persistente de workers. El
contenido se transfiere al worker y el hash se calcula antes de abrir la
transacción serializable, evitando ocupar el event loop y retener bloqueos de
base de datos durante trabajo CPU-intensivo.

El pool usa dos hilos por defecto y se configura con `CPU_WORKER_COUNT` entre 1
y 8. No se crean hilos por solicitud. Las consultas Prisma, auditorías y cambios
de estado permanecen en el proceso principal y dentro de sus transacciones:
worker threads no aceleran I/O de PostgreSQL y separar esas escrituras rompería
su atomicidad.

## Desarrollo local

```bash
docker compose -f compose.yaml -f compose.dev.yaml up -d db redis
export REDIS_URL="redis://127.0.0.1:${REDIS_PORT:-6380}"
pnpm --filter @trackon/api dev
```

Comprobación:

```bash
curl http://localhost:5173/api/ready
docker compose exec redis redis-cli INFO stats
```
