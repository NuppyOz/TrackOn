# TrackOn: guía del backend, Prisma y creación de módulos

> Documento de incorporación al equipo. Ubicación sugerida en el repositorio: `docs/backend-prisma.md`.
> Base documental: configuración, código y resultados compartidos durante la implementación. No representa una auditoría directa del repositorio remoto.

## Índice

1. [Propósito y estado actual](#1-propósito-y-estado-actual)
2. [Arquitectura y herramientas](#2-arquitectura-y-herramientas)
3. [Archivos y responsabilidades](#3-archivos-y-responsabilidades)
4. [PostgreSQL y variables de entorno](#4-postgresql-y-variables-de-entorno)
5. [Configuración de Prisma](#5-configuración-de-prisma)
6. [Modelo, migración y cliente generado](#6-modelo-migración-y-cliente-generado)
7. [Seed de roles](#7-seed-de-roles)
8. [Conexión compartida y disponibilidad](#8-conexión-compartida-y-disponibilidad)
9. [Módulo de roles implementado](#9-módulo-de-roles-implementado)
10. [Preparar el entorno de un integrante](#10-preparar-el-entorno-de-un-integrante)
11. [Crear nuevos módulos y rutas](#11-crear-nuevos-módulos-y-rutas)
12. [Validación, errores y seguridad](#12-validación-errores-y-seguridad)
13. [Trabajo en equipo y migraciones](#13-trabajo-en-equipo-y-migraciones)
14. [Verificación y solución de problemas](#14-verificación-y-solución-de-problemas)
15. [Lista de comprobación y próximos pasos](#15-lista-de-comprobación-y-próximos-pasos)

## 1. Propósito y estado actual

TrackOn es el sistema interno de órdenes de trabajo de MULTICAS S.A. Este documento explica cómo se integró PostgreSQL con Prisma y Express, y establece una guía para que otros dos integrantes puedan continuar el desarrollo con criterios comunes.

El sistema no tiene portal de clientes. Los perfiles iniciales son Administrador, Gerente Operativo y Técnico. Una persona que integra una cuadrilla no necesita por ese motivo un rol adicional de acceso: la pertenencia a una cuadrilla y los permisos del sistema son conceptos diferentes.

### Implementado y comprobado

- PostgreSQL local en Docker, con volumen persistente.
- Configuración de Prisma 7 y conexión mediante `DATABASE_URL`.
- Modelo `Rol`, tabla `roles` y primera migración.
- Prisma Client generado desde el esquema.
- Seed de tres roles mediante `upsert`.
- Instancia compartida de Prisma para Express.
- Rutas `GET /api/health`, `GET /api/ready` y `GET /api/roles`.
- Módulo de roles separado en rutas, controlador, servicio y repositorio.
- Manejador general de errores de Express.
- Comprobación de tipos y consulta HTTP del listado de roles.

### Todavía no implementado en este avance

- Inicio de sesión y autorización por permisos.
- Relación entre personas, empleados, usuarios y roles.
- Módulos de clientes, ubicaciones, equipos, cuadrillas y órdenes.
- Interfaces de React para consumir el módulo de roles.
- Pruebas automatizadas del backend y despliegue productivo.

Las secciones que proponen nuevos endpoints o validaciones son instrucciones para trabajo futuro. La tabla `roles` por sí sola no protege ninguna ruta.

## 2. Arquitectura y herramientas

Se utiliza un **monorepositorio con un monolito modular**. `apps/web` contiene React y `apps/api` contiene Express. Dentro del backend, los módulos agrupan funcionalidades del negocio.

En desarrollo, Vite escucha en el puerto 5173, Express en el 3000 y PostgreSQL en el 5432. El objetivo de producción es que Express también entregue el frontend compilado. PostgreSQL seguirá siendo un servicio de base de datos; no forma parte del proceso de Node.js.

| Herramienta | Versión verificada | Función |
| --- | --- | --- |
| Node.js | 24.20.0 | Ejecutar el backend. |
| pnpm | 10.34.5 | Administrar dependencias y workspace. |
| TypeScript | 6.0.3 | Comprobar tipos y compilar. |
| Express | 5.2.1 | Atender solicitudes HTTP. |
| PostgreSQL | Imagen `postgres:17` | Persistir datos relacionales. |
| Prisma CLI y Client | 7.10.0 | Gestionar esquema y consultar datos. |
| `@prisma/adapter-pg` | 7.10.0 | Adaptar Prisma al controlador PostgreSQL. |
| `pg` | 8.23.0 | Controlador PostgreSQL para Node.js. |
| `dotenv` | 17.4.2 | Cargar variables de entorno. |
| `tsx` | 4.23.13 | Ejecutar TypeScript durante el desarrollo. |

`mise.toml` fija Node.js y pnpm. Los archivos `package.json` y `pnpm-lock.yaml` son la referencia para dependencias. No actualizar versiones mayores individualmente sin coordinar con el equipo.

## 3. Archivos y responsabilidades

Todas las rutas de esta guía son relativas a la raíz del repositorio `trackon`, salvo que se indique otra cosa.

| Archivo o carpeta | Responsabilidad |
| --- | --- |
| `compose.yaml` | Servicio PostgreSQL local y volumen. |
| `.env` | Credenciales locales de Docker Compose. No se versiona. |
| `.env.example` | Plantilla sin secretos para Docker Compose. |
| `apps/api/.env` | URL local de conexión de Prisma y API. No se versiona. |
| `apps/api/.env.example` | Plantilla sin secretos para la API. |
| `apps/api/prisma.config.ts` | Configuración de Prisma CLI. |
| `apps/api/prisma/schema.prisma` | Modelos de datos. |
| `apps/api/prisma/migrations/` | Historial de cambios SQL. Se versiona. |
| `apps/api/prisma/seed.ts` | Datos iniciales reproducibles. |
| `apps/api/src/generated/prisma/` | Cliente generado. No se edita ni se versiona. |
| `apps/api/src/infrastructure/prisma.ts` | Instancia compartida de Prisma del servidor. |
| `apps/api/src/modules/roles/` | Funcionalidad de consulta de roles. |
| `apps/api/src/middlewares/` | Lógica HTTP transversal cuando se extraiga a archivos propios. |
| `apps/api/src/app.ts` | Configuración de Express y registro de rutas. |
| `apps/api/src/server.ts` | Inicio del servidor HTTP. |

Comprobar que `.gitignore` incluya:

```gitignore
node_modules/
dist/
.env
.env.*
!.env.example
apps/api/src/generated/prisma/
```

Conservar también las demás reglas que ya existan. Un archivo previamente versionado no deja de estarlo por agregarlo a `.gitignore`.

## 4. PostgreSQL y variables de entorno

### 4.1. Servicio local

La configuración de referencia de `compose.yaml` es:

```yaml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_USER: ${POSTGRES_USER:?Falta POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Falta POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB:?Falta POSTGRES_DB}
    ports:
      - "127.0.0.1:${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test:
        - CMD-SHELL
        - pg_isready -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s
volumes:
  postgres_data:
```

El volumen conserva los datos al detener o recrear el contenedor. `127.0.0.1` limita la publicación del puerto a la computadora local. El healthcheck comprueba disponibilidad de PostgreSQL, pero no sustituye la comprobación de credenciales desde Prisma.

```fish
docker compose up -d db
docker compose ps
docker compose stop db
```

Estos comandos, respectivamente, inician, muestran el estado y detienen el servicio sin eliminar el volumen. No usar `docker compose down -v` como solución habitual: elimina los volúmenes del proyecto y puede borrar los datos.

### 4.2. Dos archivos de entorno

En `.env` de la raíz:

```dotenv
POSTGRES_USER=trackon
POSTGRES_PASSWORD=REEMPLAZAR
POSTGRES_DB=trackon_dev
POSTGRES_PORT=5432
```

En `apps/api/.env`:

```dotenv
DATABASE_URL="postgresql://trackon:CONTRASENA_CODIFICADA@127.0.0.1:5432/trackon_dev?schema=public"
```

Los valores son ejemplos, no credenciales listas para utilizar. Cada integrante configura su contraseña local.

| Carácter de la contraseña | Representación dentro de la URL |
| --- | --- |
| `@` | `%40` |
| `/` | `%2F` |
| `"` | `%22` |
| `%` | `%25` |
| `_` | Se conserva. |

Codificar únicamente el componente de contraseña, una sola vez. `POSTGRES_PASSWORD` mantiene la contraseña original. Si la contraseña contiene comillas dobles, puede delimitarse con comillas simples en `.env`, siempre que el propio valor no contenga comillas simples.

Cambiar `.env` no cambia la contraseña de una base ya inicializada. En el entorno local utilizado, se corrigió mediante:

```fish
docker compose exec db psql -U trackon -d trackon_dev
```

Dentro de `psql`:

```text
\password trackon
```

Introducir la contraseña original dos veces y salir con `\q`. Después ajustar ambos archivos de entorno. Este procedimiento depende del acceso local configurado y no debe asumirse aplicable a cualquier servidor de producción.

## 5. Configuración de Prisma

Las dependencias incorporadas fueron `@prisma/client`, `@prisma/adapter-pg`, `pg` y `dotenv`; como dependencias de desarrollo, `prisma` y `@types/pg`. Un integrante nuevo usa `pnpm install --frozen-lockfile`, no vuelve a agregar paquetes individualmente.

Contenido de `apps/api/prisma.config.ts`:

```ts
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
```

Los comandos `pnpm --dir apps/api ...` trabajan desde la carpeta de la API. Por eso `dotenv/config` encuentra el `.env` correspondiente.

Cabecera de `schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

En esta configuración de Prisma 7, la URL de la CLI está en `prisma.config.ts`. La instancia del servidor utiliza el adaptador con su propia lectura de `DATABASE_URL`.

## 6. Modelo, migración y cliente generado

El modelo implementado es:

```prisma
model Rol {
  id          Int     @id @default(autoincrement())
  cod         String  @unique @db.VarChar(30)
  nombre      String  @db.VarChar(60)
  descripcion String? @db.VarChar(250)

  @@map("roles")
}
```

- `id`: clave primaria numérica autoincremental.
- `cod`: código obligatorio y único. El nombre real es `cod`, no `codigo`.
- `nombre`: texto visible, obligatorio.
- `descripcion`: texto opcional; `?` permite `NULL`.
- `@@map`: la tabla se llama `roles`; desde Prisma se utiliza `prisma.rol`.

Los roles se identifican por códigos estables: `ADMIN`, `GTE_OPE` y `TEC`. No programar permisos suponiendo que `id = 1` siempre significa Administrador.

Se utilizaron estos comandos para la primera tabla:

```fish
pnpm --dir apps/api exec prisma format
pnpm --dir apps/api exec prisma validate
pnpm --dir apps/api exec prisma migrate dev --name crear_roles
pnpm --dir apps/api exec prisma generate
```

| Operación | Qué hace |
| --- | --- |
| `format` | Ordena el formato del esquema. |
| `validate` | Comprueba la definición del esquema; no prueba por sí sola la conexión. |
| `migrate dev` | Crea y aplica migraciones en desarrollo. |
| `migrate deploy` | Aplica migraciones existentes, sin generar otras. |
| `generate` | Genera el cliente TypeScript; no crea tablas. |

En Prisma 7, ejecutar `generate` explícitamente. La migración queda en `prisma/migrations` y PostgreSQL registra su aplicación en `_prisma_migrations`. No editar archivos del cliente generado.

## 7. Seed de roles

Referencia del contenido de `apps/api/prisma/seed.ts`, con los códigos elegidos por el proyecto y la descripción corregida de Gerente Operativo:

```ts
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('Falta DATABASE_URL en el entorno de la API')
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const roles = [
  {
    cod: 'ADMIN',
    nombre: 'Administrador',
    descripcion: 'Administra usuarios y la configuración del sistema',
  },
  {
    cod: 'GTE_OPE',
    nombre: 'Gerente Operativo',
    descripcion: 'Programa y asigna órdenes, revisa trabajos y aprueba cierres',
  },
  {
    cod: 'TEC',
    nombre: 'Técnico',
    descripcion: 'Ejecuta órdenes, identifica equipos y registra evidencias',
  },
]

async function main() {
  await prisma.$transaction(
    roles.map((rol) =>
      prisma.rol.upsert({
        where: { cod: rol.cod },
        update: {
          nombre: rol.nombre,
          descripcion: rol.descripcion,
        },
        create: rol,
      }),
    ),
  )
  console.log('Seed completado: los tres roles iniciales están registrados.')
}

main()
  .catch((error: unknown) => {
    console.error('No se pudo completar el seed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

```fish
pnpm --dir apps/api exec prisma db seed
```

`upsert` busca por `cod`: crea si no existe y actualiza nombre y descripción si existe. La transacción aplica las tres operaciones juntas o revierte sus cambios si alguna falla. Al terminar se cierra la conexión.

Repetir el seed no duplica estos códigos, pero sí restablece sus nombres y descripciones. Cambiar un código crea otro registro; no renombra automáticamente el anterior. Los identificadores autoincrementales pueden tener saltos, lo cual no implica pérdida de registros.

El seed tiene una instancia propia de Prisma porque es un programa independiente del servidor.

## 8. Conexión compartida y disponibilidad

`apps/api/src/infrastructure/prisma.ts`:

```ts
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('Falta DATABASE_URL en el entorno de la API')
}

const adapter = new PrismaPg({
  connectionString,
  connectionTimeoutMillis: 3000,
})

export const prisma = new PrismaClient({ adapter })
```

Una instancia compartida por proceso permite reutilizar el pool. No crear un cliente por petición ni ejecutar `$disconnect()` al terminar cada respuesta. El cierre ordenado al detener el servidor está pendiente de implementación.

El timeout limita la espera de conexión; no limita todas las consultas a tres segundos.

| Endpoint | Respuesta normal | Propósito |
| --- | --- | --- |
| `GET /api/health` | HTTP 200 | Express responde. |
| `GET /api/ready` | HTTP 200, `database: connected` | PostgreSQL acepta una consulta desde la API. |
| `GET /api/ready` cuando falla la consulta | HTTP 503 | Dependencia de base de datos no disponible. |

La ruta `/api/ready` ejecuta `prisma.$queryRaw` con la plantilla literal fija `SELECT 1`. No modifica datos ni valida todo el esquema. Una base sin las tablas de negocio podría responder a esa consulta.

## 9. Módulo de roles implementado

### 9.1. Responsabilidades

| Capa | Responsabilidad | Evitar |
| --- | --- | --- |
| Routes | Asociar método y URL al controlador; colocar middlewares. | Consultas SQL y reglas del negocio. |
| Controller | Leer entradas HTTP y construir la respuesta. | Consultar Prisma directamente. |
| Service | Aplicar reglas del negocio y organizar operaciones. | Depender de `Request` o `Response`. |
| Repository | Acceder a datos, seleccionar campos y ordenar. | Decidir respuestas HTTP o permisos por sí solo. |
| Schema de entrada, futuro | Validar parámetros, query y body. | Confundirlo con el esquema de tablas de Prisma. |

El flujo de una petición es: rutas → controlador → servicio → repositorio. Los resultados regresan al controlador, que responde al cliente. Los errores se propagan al middleware correspondiente.

### 9.2. Repositorio: `roles.repository.ts`

```ts
import { prisma } from '../../infrastructure/prisma.js'

export function listarRoles() {
  return prisma.rol.findMany({
    select: {
      id: true,
      cod: true,
      nombre: true,
      descripcion: true,
    },
    orderBy: { nombre: 'asc' },
  })
}
```

Se seleccionan explícitamente los campos que forman parte de la respuesta. En entidades futuras esto ayuda a evitar exponer contraseñas, tokens u otros campos internos.

### 9.3. Servicio: `roles.service.ts`

```ts
import * as rolesRepository from './roles.repository.js'

export function listarRoles() {
  return rolesRepository.listarRoles()
}
```

Actualmente delega sin reglas adicionales. Es válido mantenerlo simple: no agregar validaciones artificiales para llenar una capa.

### 9.4. Controlador: `roles.controller.ts`

```ts
import type { Request, Response, NextFunction } from 'express'
import * as rolesService from './roles.service.js'

export async function listarRoles(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const roles = await rolesService.listarRoles()
    res.status(200).json({ data: roles })
  } catch (error) {
    next(error)
  }
}
```

El proyecto usa `try/catch` y `next(error)` explícitos para mantener una convención fácil de seguir. No enviar otra respuesta después de delegar el error.

### 9.5. Rutas: `roles.routes.ts`

```ts
import { Router } from 'express'
import * as rolesController from './roles.controller.js'

export const rolesRouter = Router()
rolesRouter.get('/', rolesController.listarRoles)
```

### 9.6. Registro y manejo de errores en `app.ts`

La siguiente es una referencia integrada de las rutas descritas. Al editar el archivo real, conservar cualquier configuración adicional ya existente y no duplicar manejadores.

```ts
import express from 'express'
import type { ErrorRequestHandler } from 'express'
import { prisma } from './infrastructure/prisma.js'
import { rolesRouter } from './modules/roles/roles.routes.js'

export const app = express()

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'API de TrackOn funcionando correctamente',
  })
})

app.get('/api/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.status(200).json({ status: 'ok', database: 'connected' })
  } catch {
    console.error('La comprobación de conexión con PostgreSQL falló')
    res.status(503).json({
      status: 'unavailable',
      database: 'unavailable',
    })
  }
})

app.use('/api/roles', rolesRouter)

const manejarErrores: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error('Error al procesar la solicitud:', error)
  res.status(500).json({
    error: { message: 'No se pudo completar la solicitud.' },
  })
}

app.use(manejarErrores)
```

La URL final resulta de combinar `/api/roles` con `/` del router. No repetir el prefijo dentro de `roles.routes.ts`.

Los cuatro parámetros identifican al middleware de errores. Este debe estar después de las rutas. El manejador actual trata los errores delegados como 500; aún no clasifica errores de negocio ni implementa un 404 JSON general.

### 9.7. Contrato actual de `GET /api/roles`

- Entrada: sin body ni parámetros.
- Respuesta exitosa: 200, objeto `{ data: [...] }`.
- Datos: `id`, `cod`, `nombre`, `descripcion`.
- Orden: nombre ascendente.
- Lista vacía: 200 con `data: []`.
- Error inesperado: 500 con mensaje general.
- Autorización: todavía no implementada.

La consulta mostró los códigos `ADMIN`, `GTE_OPE` y `TEC`. La descripción del Gerente Operativo tenía el error de escritura “asina”; se indicó corregirlo en el seed y volver a ejecutarlo.

## 10. Preparar el entorno de un integrante

Requisitos: acceso al repositorio, Git, Docker Compose operativo y `mise` activado en la terminal. Los comandos se ejecutan en la computadora de cada integrante.

### Paso 1. Obtener el repositorio

```fish
git clone https://github.com/NuppyOz/TrackOn.git trackon
cd trackon
mise install
node --version
pnpm --version
pnpm install --frozen-lockfile
```

Las versiones de Node.js y pnpm deben coincidir con `mise.toml`. Si Fish no encuentra pnpm o muestra otro Node.js, revisar la activación de `mise`; para la sesión actual se utilizó `mise activate fish | source`.

Si pnpm advierte scripts bloqueados, revisar cuáles solicita. Durante la configuración se aprobaron los necesarios de esbuild y Prisma con `pnpm approve-builds`. No aprobar paquetes desconocidos en bloque. Los cambios de política del workspace deben revisarse con el equipo.

### Paso 2. Configurar variables locales

Solo si no existen los archivos de destino:

```fish
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

Completar las credenciales según la sección 4. Comprobar que estén ignorados:

```fish
git check-ignore .env apps/api/.env
```

Deben aparecer ambas rutas. Nunca compartir los archivos con secretos en un commit.

### Paso 3. Iniciar la base y aplicar lo existente

```fish
docker compose up -d db
docker compose ps
pnpm --dir apps/api exec prisma migrate deploy
pnpm --dir apps/api exec prisma generate
pnpm --dir apps/api exec prisma db seed
```

Esperar a que PostgreSQL esté disponible antes de las migraciones. `migrate deploy` aplica los archivos compartidos; no crea una nueva migración de roles.

### Paso 4. Ejecutar el backend

```fish
pnpm --dir apps/api run typecheck
pnpm --dir apps/api run dev
```

Abrir `http://localhost:3000/api/health`, `/api/ready` y `/api/roles`.

Cada integrante tendrá su propia base local. Git comparte código, migraciones y datos iniciales definidos en el seed; no copia todos los datos de una computadora a otra.

## 11. Crear nuevos módulos y rutas

Esta sección es una **guía para trabajo futuro**, no una lista de funcionalidades ya implementadas. Usar el módulo de roles como ejemplo ejecutable. No copiarlo reemplazando palabras sin revisar las reglas y relaciones de la nueva entidad.

### Paso 1. Definir la operación antes de programar

Para cada tarea, acordar:

1. Qué necesidad del usuario resuelve.
2. Qué actor puede realizarla.
3. Qué datos recibe y devuelve.
4. Qué reglas se deben cumplir.
5. Qué sucede si un registro no existe, está inactivo o pertenece a otro contexto.
6. Cómo se comprobará el comportamiento.

Por ejemplo, una futura consulta de ubicaciones debe filtrar por el cliente elegido. No debe devolver todas las direcciones de todos los clientes.

### Paso 2. Diseñar el contrato HTTP

Convenciones propuestas para el equipo:

| Operación | Método y URL de ejemplo | Éxito |
| --- | --- | --- |
| Listar | `GET /api/clientes` | 200 |
| Consultar uno | `GET /api/clientes/:id` | 200 |
| Crear | `POST /api/clientes` | 201 |
| Actualizar parcialmente | `PATCH /api/clientes/:id` | 200 |
| Listar ubicaciones de un cliente | `GET /api/clientes/:clienteId/ubicaciones` | 200 |

Estos endpoints aún no existen. No crear rutas de eliminación por costumbre: clientes, órdenes y evidencias pueden requerir conservación histórica o desactivación.

Usar nombres de recursos en plural y parámetros claros. Una lista vacía se devuelve como 200 con un arreglo vacío; un recurso individual inexistente corresponde a 404.

### Paso 3. Revisar primero el modelo de datos

Comprobar si la operación requiere tablas, relaciones, restricciones o índices nuevos. Actualizar el modelo aprobado y coordinar con quien esté modificando el mismo esquema.

En TrackOn deben preservarse estas reglas de diseño:

- Un cliente puede ser persona natural o jurídica; no asumir siempre una empresa.
- Un cliente tiene varias ubicaciones. La dirección elegida debe pertenecer al cliente.
- La pertenencia a una cuadrilla no sustituye la identidad de la persona ni sus permisos.
- La identificación del equipo corresponde al técnico y debe acompañarse de la evidencia requerida de su etiqueta.
- Los cambios de estado de las órdenes necesitan reglas específicas; no aceptar cualquier estado enviado por el navegador.

La implementación concreta de estas entidades sigue pendiente. Revisar los requisitos antes de fijar sus campos.

### Paso 4. Crear archivos con responsabilidades definidas

Para un módulo futuro de clientes:

```fish
mkdir -p apps/api/src/modules/clientes
```

| Archivo propuesto | Contenido |
| --- | --- |
| `clientes.routes.ts` | Métodos, rutas y middlewares aplicables. |
| `clientes.controller.ts` | Entradas HTTP y respuestas. |
| `clientes.service.ts` | Reglas y coordinación de operaciones. |
| `clientes.repository.ts` | Consultas de Prisma. |
| `clientes.schema.ts` | Validación de entradas cuando se incorpore Zod. |

No crear archivos vacíos innecesarios. No se requiere una clase por capa: el proyecto utiliza funciones exportadas. Mantener nombres como `listarClientes`, `obtenerCliente` o `crearCliente`, que expresen una acción.

### Paso 5. Implementar el repositorio

Importar la instancia compartida de `infrastructure/prisma.ts`. Seleccionar solo los campos necesarios y filtrar en la consulta, no descargar toda la tabla para filtrar en memoria.

Elegir el método apropiado: `findMany` para listas, `findUnique` para identificadores únicos, `create` para inserciones y `update` para modificaciones. No copiar `upsert` del seed a todas las operaciones: crear y actualizar pueden tener permisos y reglas diferentes.

Las listas grandes necesitan paginación y un orden estable. El catálogo pequeño de roles no exige aún ese mecanismo.

### Paso 6. Implementar el servicio

El servicio recibe valores del negocio, no objetos de Express. Verifica reglas y llama a los repositorios.

Ejemplo conceptual, no código listo para ejecutar: para crear una orden, comprobar cliente y ubicación, validar su relación y la asignación, y guardar los cambios relacionados de manera atómica cuando corresponda.

Cuando una operación necesite varios cambios que deban confirmarse juntos, diseñar una transacción compartida. Todos los repositorios involucrados deben usar el cliente de esa transacción, no la instancia global fuera de ella. No introducir llamadas lentas a servicios externos dentro de una transacción de base de datos sin justificarlo.

### Paso 7. Implementar el controlador

El controlador debe:

1. Obtener parámetros, filtros o body.
2. Validar y transformar los datos de entrada.
3. Llamar al servicio con los datos válidos.
4. Responder con el código HTTP y formato acordados.
5. Delegar errores inesperados con `next(error)`.

No pasar `req.body` directamente a Prisma. Construir explícitamente los campos permitidos para evitar que el cliente modifique propiedades internas.

### Paso 8. Conectar router y aplicación

Ejemplo de estructura futura, ejecutable solo después de crear el controlador correspondiente:

```ts
// clientes.routes.ts
import { Router } from 'express'
import * as clientesController from './clientes.controller.js'

export const clientesRouter = Router()
clientesRouter.get('/', clientesController.listarClientes)
```

Luego importar el router en `app.ts` y registrarlo antes del manejador de errores:

```ts
import { clientesRouter } from './modules/clientes/clientes.routes.js'

// Dentro de la configuración de app, después de crearla:
app.use('/api/clientes', clientesRouter)
```

La ruta final es `GET /api/clientes`. Si se agrega `get('/:id', ...)`, será `GET /api/clientes/:id`. Registrar rutas estáticas como `/buscar` antes de rutas dinámicas como `/:id` cuando puedan confundirse.

Para futuras rutas con body JSON, agregar una sola vez y antes de los routers:

```ts
app.use(express.json({ limit: '1mb' }))
```

El límite es una propuesta inicial ajustable. Las fotos no deben enviarse como grandes cadenas dentro del JSON: su flujo de carga privada se diseñará aparte. La ruta GET actual de roles no necesita body.

### Paso 9. Documentar y probar el contrato

Cada endpoint nuevo debe registrar:

| Dato | Qué escribir |
| --- | --- |
| Método y URL | Dirección completa y parámetros. |
| Autorización | Actor permitido y restricciones por registro. |
| Entrada | Campos, tipos, obligatoriedad y límites. |
| Éxito | Estado HTTP y ejemplo JSON. |
| Errores | Casos esperados y estados HTTP. |
| Efectos | Tablas modificadas, transacciones y trazabilidad. |

OpenAPI está previsto en el stack, pero todavía no se ha incorporado en este avance. Mientras se implementa, mantener el contrato en Markdown junto al módulo o en documentación de API.

## 12. Validación, errores y seguridad

### 12.1. Tres controles diferentes

| Control | Pregunta que responde | Ubicación |
| --- | --- | --- |
| Validación de entrada | ¿Tiene el formato y rango esperado? | Schema/controlador. |
| Regla de negocio | ¿Esta operación está permitida en este contexto? | Servicio. |
| Integridad de datos | ¿Se respetan claves, relaciones y unicidad? | PostgreSQL/Prisma. |

TypeScript no valida los datos recibidos por HTTP en tiempo de ejecución. `schema.prisma` describe la base y no reemplaza un validador de peticiones.

Zod forma parte del stack previsto, pero no aparece entre las dependencias confirmadas de este avance. Antes de usar `import { z } from 'zod'`, incorporarlo como dependencia de la API, revisar su versión y acordar la convención del equipo. No presentar esos archivos como ya existentes.

### 12.2. Ejemplo pequeño de validación de un parámetro

El siguiente patrón muestra la idea sin agregar una dependencia. Es un fragmento para una futura ruta con `:id`, no una modificación necesaria para listar roles:

```ts
const valor = req.params.id

if (typeof valor !== 'string' || !/^[1-9]\d*$/.test(valor)) {
  res.status(400).json({
    error: { message: 'El identificador debe ser un entero positivo.' },
  })
  return
}

const id = Number(valor)

if (!Number.isSafeInteger(id) || id > 2147483647) {
  res.status(400).json({
    error: { message: 'El identificador está fuera del rango permitido.' },
  })
  return
}

// Llamar al servicio con id, ya validado.
```

El límite superior corresponde al `Int` de PostgreSQL utilizado por `Rol`; no copiarlo si otro modelo utiliza UUID o BigInt. Con un validador centralizado, trasladar esta lógica al esquema de entrada.

### 12.3. Estados HTTP propuestos

| Estado | Uso |
| --- | --- |
| 200 | Consulta o actualización exitosa con respuesta. |
| 201 | Recurso creado. |
| 204 | Éxito sin cuerpo de respuesta, cuando el contrato lo establezca. |
| 400 | Entrada inválida. |
| 401 | Falta una autenticación válida. |
| 403 | Usuario autenticado sin permiso. |
| 404 | Recurso individual inexistente. |
| 409 | Conflicto, como un código único duplicado. |
| 500 | Error inesperado del servidor. |
| 503 | Dependencia no disponible en la comprobación de disponibilidad. |

El middleware actual siempre devuelve 500 para errores delegados. Antes de implementar errores de negocio, ampliarlo para reconocer errores controlados y mapearlos de forma consistente. No lanzar un `Error` genérico esperando que automáticamente se convierta en 404.

Mantener `{ data: ... }` para éxitos y `{ error: { message: ... } }` para errores. Los detalles de validación pueden incorporarse después mediante un contrato común.

### 12.4. Permisos y datos sensibles

- La autenticación identifica al usuario; la autorización decide qué puede hacer.
- No confiar en un rol enviado en el body ni solo en ocultar botones en React.
- Las rutas deben aplicar los permisos en el backend y, cuando corresponda, comprobar asignación o acceso al registro específico.
- No exponer contraseñas, hashes, tokens, cadenas de conexión o rutas privadas de almacenamiento.
- Las evidencias fotográficas se diseñarán con almacenamiento privado; su autorización es parte del flujo de negocio.
- Evitar SQL construido por concatenación con entradas del usuario. Priorizar consultas de Prisma y parámetros seguros.

## 13. Trabajo en equipo y migraciones

### 13.1. Cambios de código

Crear una rama por tarea y revisar antes de integrar a `main`. Propuesta de comandos, partiendo de una copia sin cambios locales pendientes:

```fish
git switch main
git pull --ff-only
git switch -c feat/modulo-clientes
```

Al finalizar, ejecutar las comprobaciones correspondientes, revisar `git diff` y agregar solo los archivos de la tarea. Publicar la rama y solicitar revisión mediante un pull request. Esta es una convención propuesta para el equipo, no una configuración de protección de ramas ya aplicada.

### 13.2. Cambios en la base

Al modificar el esquema:

```fish
pnpm --dir apps/api exec prisma format
pnpm --dir apps/api exec prisma validate
pnpm --dir apps/api exec prisma migrate dev --name descripcion_del_cambio
pnpm --dir apps/api exec prisma generate
pnpm --dir apps/api run typecheck
```

Reemplazar `descripcion_del_cambio` por un nombre concreto. Revisar el SQL generado antes de compartirlo. No aceptar un reinicio de base solicitado por Prisma sin entender su causa y los datos afectados.

Reglas del equipo:

- Coordinar cambios concurrentes en los mismos modelos.
- Versionar el esquema y su migración en el mismo cambio.
- No editar migraciones ya compartidas y aplicadas; crear una nueva.
- No modificar tablas manualmente en DBeaver como procedimiento normal de desarrollo.
- Evitar `db push` para cambios del proyecto que necesitan historial compartido.
- Después de obtener cambios ajenos, aplicar migraciones existentes y regenerar el cliente.
- El seed se vuelve a ejecutar cuando se necesita actualizar sus datos, no como sustituto de una migración.
- Antes de operaciones destructivas sobre datos importantes, preparar y verificar un respaldo.

### 13.3. Archivos que se comparten

| Compartir por Git | Mantener local/generado |
| --- | --- |
| Código TypeScript y esquema Prisma | `.env` con credenciales |
| Migraciones SQL | `node_modules` |
| Seed sin secretos | Cliente Prisma generado |
| `package.json` y `pnpm-lock.yaml` | `dist` |
| `.env.example` sin secretos | Volumen de PostgreSQL |
| Documentación y configuración | Dumps con información privada |

Commits sugeridos:

```text
build(api): configurar Prisma y conexión a PostgreSQL
feat(api): crear modelo de roles y seed inicial
feat(api): conectar Prisma y agregar comprobación de disponibilidad
feat(api): implementar consulta de roles
docs(api): documentar backend y guía de módulos
```

Son ejemplos de mensajes; no afirman que todos esos commits existan exactamente así en el historial.

## 14. Verificación y solución de problemas

### 14.1. Comandos útiles

```fish
# Revisar tipos sin generar JavaScript
pnpm --dir apps/api run typecheck

# Comprobar conexión desde Prisma CLI sin modificar tablas
echo 'SELECT 1;' | pnpm --dir apps/api exec prisma db execute --stdin

# Inspeccionar la tabla de roles
docker compose exec db psql -U trackon -d trackon_dev -c '\d roles'

# Consultar sus datos
docker compose exec db psql -U trackon -d trackon_dev -c 'SELECT id, cod, nombre FROM roles ORDER BY id;'

# Ver estado HTTP y JSON del endpoint
curl -i http://localhost:3000/api/roles
```

`typecheck` exitoso no prueba las reglas de negocio. `db execute` exitoso no demuestra que Express esté conectado. `/api/ready` tampoco verifica todas las tablas. Cada comprobación aporta evidencia diferente.

### 14.2. Evidencia del avance

Se observó `Script executed successfully` en Prisma CLI, la estructura de `roles` con clave primaria y código único, la ejecución exitosa del seed y una respuesta HTTP con los tres roles. TypeScript pasó después de crear el archivo de servicio que faltaba.

Se indicó repetir el seed para comprobar ausencia de duplicados; si no se dispone del resultado de esa segunda ejecución, no registrarlo como prueba ejecutada. Las comprobaciones documentadas no equivalen a una suite automatizada.

### 14.3. Errores frecuentes

| Síntoma | Comprobación o causa | Acción |
| --- | --- | --- |
| Prisma P1001 | PostgreSQL no disponible o dirección incorrecta. | Revisar `docker compose ps`, puerto y URL. |
| Prisma P1000 | Credenciales no válidas. | Revisar contraseña real y su codificación; no borrar el volumen. |
| Falta `POSTGRES_PASSWORD` | Archivo raíz ausente o valor vacío. | Completar `.env` de Compose. |
| TS2307 para `roles.service.js` | Archivo `.ts` ausente o nombre distinto. | Crear/revisar `roles.service.ts` y guardarlo. |
| TS2307 del cliente generado | Prisma Client aún no generado o ruta incorrecta. | Ejecutar `prisma generate` y revisar `output`. |
| `Cannot GET /api/...` | Router no registrado o URL/método incorrectos. | Revisar el prefijo de `app.use` y la ruta interna. |
| `req.body` no disponible | Falta parser JSON o cabecera correcta. | Configurar parser antes del router y enviar JSON válido. |
| Lista vacía | Base distinta o seed no ejecutado. | Revisar destino de conexión y datos locales. |
| Puerto ocupado | Ya hay un proceso o servicio usándolo. | Identificar el proceso; no iniciar otra API por duplicado. |
| `ELIFECYCLE` tras TypeScript | Falló el comando del script. | Resolver primero el error anterior de TypeScript. |

Linux distingue mayúsculas y minúsculas. Los imports `.js` del código fuente son intencionales por `NodeNext`; no crear archivos JavaScript manuales para satisfacerlos.

### 14.4. Qué probar en un módulo nuevo

- Caso exitoso con datos reales de desarrollo.
- Entrada inválida y su estado HTTP.
- Recurso individual inexistente cuando exista esa operación.
- Conflicto de unicidad o relación inválida cuando corresponda.
- Acceso permitido y denegado cuando se incorpore autorización.
- Reversión de una transacción si una operación parcial falla.

Agregar pruebas automatizadas que comprueben reglas relevantes, no pruebas que solo repitan la implementación. Usar una base de pruebas separada antes de automatizar operaciones que alteren datos.

## 15. Lista de comprobación y próximos pasos

Antes de compartir un módulo:

- [ ] El requisito y los actores permitidos están claros.
- [ ] Los nombres de rutas, funciones y modelos son consistentes.
- [ ] El router está registrado antes del manejador de errores.
- [ ] El controlador se ocupa de HTTP y el servicio de las reglas.
- [ ] Las consultas están en el repositorio y usan Prisma compartido.
- [ ] Se validan las entradas y solo se aceptan campos permitidos.
- [ ] Las restricciones de base de datos respaldan la integridad necesaria.
- [ ] Los errores esperados tienen un tratamiento definido.
- [ ] Se seleccionan únicamente campos que pueden devolverse.
- [ ] El esquema y las migraciones necesarias están incluidos.
- [ ] `typecheck` pasa y se verificaron los casos relevantes.
- [ ] No se incluyen secretos ni archivos generados en el commit.
- [ ] El contrato del endpoint y esta guía están actualizados si corresponde.
- [ ] Otra persona puede preparar el entorno siguiendo la documentación.

Próximos trabajos a acordar: validación de entradas con Zod, manejo de errores controlados, autenticación y autorización, cierre ordenado del servidor, próximos modelos de negocio y pruebas automatizadas. No publicar las rutas actuales como sistema interno listo para producción mientras falten los controles de acceso.

### Mantener esta documentación

Agregar en el `README.md` principal:

```md
## Documentación

- [Backend, Prisma y guía para crear módulos](docs/backend-prisma.md)
```

Revisar y guardar el documento mediante un commit de documentación. Actualizarlo dentro del mismo cambio que modifique contratos, configuración o convenciones.

### Referencias oficiales

- [Prisma: configuración](https://www.prisma.io/docs/orm/reference/prisma-config-reference).
- [Prisma: comandos de CLI](https://www.prisma.io/docs/orm/reference/prisma-cli-reference).
- [Prisma: seed](https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding).
- [Express: rutas](https://expressjs.com/en/guide/routing.html).
- [Express: manejo de errores](https://expressjs.com/en/guide/error-handling.html).
- [Docker Compose: variables de entorno](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/).

Las versiones instaladas y el código del repositorio prevalecen sobre ejemplos de otras versiones. Esta guía debe evolucionar con el proyecto.
