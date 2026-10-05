# Docker para TrackOn

## Servicios

- `web`: build de React/Vite servido por Nginx; el mismo origen enruta `/api` a la API.
- `api`: Express/Node.js, sin publicar el puerto al host.
- `migrate`: contenedor de una sola ejecución que aplica `prisma migrate deploy` antes de la API.
- `db`: PostgreSQL 17 con volumen persistente y healthcheck.

La API escucha internamente en `0.0.0.0:3000`. Solo la web se publica en el host y, por defecto, queda enlazada a `127.0.0.1:8080`. PostgreSQL y la API no quedan expuestos directamente al host. No se configura almacenamiento S3/MinIO porque aún no hay un cliente o módulo de archivos que lo use en el código.

## Preparar variables locales

Desde la raíz del repositorio:

```bash
[ -f .env ] || cp .env.example .env
```

El comando crea `.env` solo si no existe; no sobrescribe tu archivo actual. Edita/verifica `.env` antes de arrancar:

- Cambia `POSTGRES_PASSWORD` y usa el mismo valor dentro de `DATABASE_URL`. Si usas caracteres especiales en usuario o contraseña, codifícalos según URL encoding.
- Cambia `AUTH_ACCESS_TOKEN_SECRET` por un secreto aleatorio de al menos 32 bytes. Por ejemplo, genera uno con `openssl rand -hex 32` y pégalo en el `.env`.
- No copies secretos reales a `.env.example`, Git ni logs.

Si ya existe `.env`, no lo sobrescribas: agrega/verifica estas variables manualmente. Docker Compose lee este archivo automáticamente desde la raíz.

## Arranque

```bash
docker compose up --build -d
docker compose ps
docker compose logs -f api
```

Abre `http://localhost:8080`. Para seguir todos los servicios: `docker compose logs -f`. La API no es publicada al host; desde el equipo Docker, su healthcheck y la interfaz permiten verificarla. Dentro de la red Compose está disponible como `http://api:3000`.

Compose espera a que PostgreSQL esté saludable, ejecuta migraciones y luego inicia la API. Las migraciones son requisito de arranque; si fallan, API/web quedan sin iniciar y el error aparece en `docker compose logs migrate`.

## Operación

```bash
# Estado y healthchecks
docker compose ps

# Logs puntuales
docker compose logs --tail=100 db migrate api web

# Aplicar migraciones tras incorporar una migración nueva
docker compose run --rm migrate

# Ejecutar el seed idempotente de roles/estados iniciales (opcional)
docker compose run --rm --entrypoint pnpm migrate exec prisma db seed

# Detener contenedores conservando los datos
docker compose down
```

Los datos viven en el volumen `postgres_data`; `docker compose down` los conserva. No uses `docker compose down -v` salvo que realmente quieras borrar la base local de forma irreversible.

Para cambiar el puerto local de la interfaz, ajusta `WEB_PORT` en `.env`. El puerto de PostgreSQL no está publicado; para inspección puedes abrir `docker compose exec db sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'` dentro del contenedor, o añadir una exposición local controlada solo en desarrollo.

## Construcción y escalado

Los contenedores web/API son sin estado y pueden reconstruirse/reemplazarse sin depender del filesystem del contenedor. Compose local ejecuta una instancia de cada uno; desplegar varias réplicas requiere un balanceador/orquestador y una estrategia externa para ejecutar la migración una sola vez por release. El pool de conexiones debe dimensionarse considerando réplicas API × conexiones por instancia y la capacidad real de PostgreSQL; no se declara un RPS ni capacidad de 10,000 requests sin pruebas e infraestructura medidas.

El secreto JWT debe ser idéntico entre todas las réplicas. Para producción, inyecta secretos con el gestor de secretos del entorno, configura TLS/ingress, backups y recuperación del volumen PostgreSQL, límites de recursos, política de actualización de imágenes y monitoreo. El `.env` descrito arriba es solo una comodidad local, no un gestor de secretos de producción.
