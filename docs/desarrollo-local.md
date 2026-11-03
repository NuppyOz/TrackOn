# Desarrollo local con recarga automática

Este flujo ejecuta PostgreSQL y Redis en Docker. La API usa `tsx watch` y la
interfaz usa Vite, por lo que los cambios en `apps/api/src` y `apps/web/src` se
reflejan automáticamente.

## Preparación inicial

Usa Node.js `24.22.1` (incluye los [parches de seguridad del 21 de octubre de
2026](https://nodejs.org/en/blog/release/v24.22.1)) y pnpm `10.34.5`, fijados en
`mise.toml`. Si usas mise, ejecuta `mise install` y activa mise en tu terminal.
Si usas nvm:

```bash
nvm install 24.22.1
nvm use 24.22.1
corepack enable pnpm
```

Si aparece `pnpm: orden no encontrada` con Node ya instalado, ejecuta
`corepack enable pnpm`. Corepack usa la versión de pnpm de `package.json`.
Comprueba `node --version` y `pnpm --version` antes de instalar dependencias.

Desde la raíz del repositorio:

```bash
[ -f .env ] || cp .env.example .env
pnpm install --frozen-lockfile
```

Revisa las credenciales de desarrollo en `.env`. `POSTGRES_PORT` puede omitirse;
en ese caso se utiliza el puerto local `5433`.

Prepara también el archivo que carga la API al ejecutarse desde `apps/api`:

```bash
[ -f apps/api/.env ] || cp apps/api/.env.example apps/api/.env
```

En `apps/api/.env`, ajusta el usuario, contraseña y base de `DATABASE_URL` para
que coincidan con `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_DB` del `.env`
raíz. Usa `127.0.0.1` y el puerto `POSTGRES_PORT` (por defecto `5433`). Copia
también `AUTH_ACCESS_TOKEN_SECRET` del `.env` raíz. Si cambias `REDIS_PORT`,
ajusta `REDIS_URL` (por defecto `redis://127.0.0.1:6380`). Codifica los caracteres
especiales del usuario y contraseña al escribirlos en una URL.

El `.env` raíz conserva las direcciones `db:5432` y `redis:6379` para Docker;
`apps/api/.env` usa los puertos locales publicados. Ambos archivos se excluyen
del repositorio porque contienen secretos.

## Arranque

Si antes se levantó el entorno completo de Docker, detén la web y la API
contenedorizadas. Luego inicia la base con el override de desarrollo:

```bash
docker compose stop web api
docker compose -f compose.yaml -f compose.dev.yaml up -d db redis
```

En otra terminal, inicia la API:

```bash
pnpm --filter @trackon/api dev
```

Desde `apps/api` también puedes ejecutar `pnpm dev`. La API carga su `.env`
automáticamente. Si tu terminal tiene variables antiguas exportadas, elimínalas
con `unset DATABASE_URL REDIS_URL` para que se usen los valores del archivo.

La primera vez, crea los usuarios `administrador` y `tecnico` desde otra terminal
en la raíz del repositorio. Elige una contraseña de al menos 12
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

Con `apps/api/.env` configurado, aplica migraciones cuando el repositorio
incorpore alguna nueva:

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
