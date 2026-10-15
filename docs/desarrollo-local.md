# Desarrollo local con recarga automática

Este flujo ejecuta solamente PostgreSQL en Docker. La API usa `tsx watch` y la
interfaz usa Vite, por lo que los cambios en `apps/api/src` y `apps/web/src` se
reflejan automáticamente.

## Preparación inicial

Desde la raíz del repositorio:

```bash
[ -f .env ] || cp .env.example .env
pnpm install --frozen-lockfile
```

Revisa las credenciales de desarrollo en `.env`. `POSTGRES_PORT` puede omitirse;
en ese caso se utiliza el puerto local `5433`.

## Arranque

Si antes se levantó el entorno completo de Docker, detén la web y la API
contenedorizadas. Luego inicia la base con el override de desarrollo:

```bash
docker compose stop web api
docker compose -f compose.yaml -f compose.dev.yaml up -d db
```

En otra terminal, inicia la API:

```bash
set -a
source .env
set +a
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_PORT:-5433}/${POSTGRES_DB}?schema=public"
pnpm --filter @trackon/api dev
```

La primera vez, crea los usuarios `administrador` y `tecnico` desde otra terminal
que tenga la misma `DATABASE_URL` exportada. Elige una contraseña de al menos 12
caracteres:

```bash
DEV_USERS_PASSWORD='elige-una-clave-segura' pnpm --filter @trackon/api seed:dev-users
```

El comando solo está permitido fuera de producción y también permite restablecer
la contraseña de ambas cuentas locales si se vuelve a ejecutar.

Para cargar clientes, ubicaciones, equipos, servicios, empleados y cuadrillas de
ejemplo, ejecuta en esa misma terminal:

```bash
pnpm --filter @trackon/api seed:dev-data
```

El comando es idempotente: puede repetirse sin duplicar los registros de ejemplo.

En una tercera terminal, inicia el frontend:

```bash
pnpm --filter web dev
```

Abre `http://localhost:5173`. Vite reenvía las solicitudes `/api` al backend
en `http://localhost:3000`.

## Migraciones y comprobación

Con `DATABASE_URL` exportada como en la terminal de la API, aplica migraciones
cuando el repositorio incorpore alguna nueva:

```bash
pnpm --filter @trackon/api exec prisma migrate deploy
```

Comprueba la conexión completa mediante el proxy de Vite:

```bash
curl http://localhost:5173/api/ready
```

La respuesta esperada es `{"status":"ok","database":"connected"}`.

## Detener

Detén Vite y la API con `Ctrl+C` en sus terminales. Para detener PostgreSQL sin
borrar sus datos:

```bash
docker compose -f compose.yaml -f compose.dev.yaml down
```

No agregues `-v` salvo que quieras borrar definitivamente la base local.

## Conexión desde DataGrip

La base debe estar levantada con `compose.dev.yaml`, que publica PostgreSQL solo
en la interfaz local:

```bash
docker compose -f compose.yaml -f compose.dev.yaml up -d db
```

En DataGrip crea un data source de tipo **PostgreSQL** con estos valores:

- Host: `localhost`
- Port: `5433` (o el valor de `POSTGRES_PORT` en `.env`)
- Database: `trackon_dev` (o el valor de `POSTGRES_DB` en `.env`)
- User: `trackon` (o el valor de `POSTGRES_USER` en `.env`)
- Password: el valor de `POSTGRES_PASSWORD` en `.env`
- URL: `jdbc:postgresql://localhost:5433/trackon_dev`
- SSL: desactivado para este entorno local

Pulsa **Test Connection**, descarga el driver PostgreSQL si DataGrip lo solicita
y selecciona el esquema `public` en la pestaña **Schemas**.
