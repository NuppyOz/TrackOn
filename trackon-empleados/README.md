# TrackOn — Módulo Empleados

Paquete del módulo **Empleados** para `feature/empleados`, siguiendo el diseño visual de TrackOn (sin alterar el stack).

## Prerrequisitos

- **Primero fusionar el PR de Clientes a `dev`.** Crear la rama desde `origin/dev` actualizado; no desde `feature/ordenes-mvp` o `feature/clientes-ubicaciones`.
- Tener un árbol de trabajo limpio antes de aplicar este paquete.
- Python 3 y pnpm del proyecto disponibles.

## Aplicación

Desde la raíz del repositorio local:

```bash
git switch dev
git pull --ff-only origin dev
git switch -c feature/empleados
```

Extraer `trackon-empleados/` a la raíz del proyecto (la carpeta contiene `instalar.py`). Luego:

```bash
python3 trackon-empleados/instalar.py
pnpm --dir apps/web run test
pnpm --dir apps/web run build
pnpm --dir apps/web run lint
pnpm --dir apps/web run test:coverage
pnpm --dir apps/api run typecheck
# Las pruebas de integración de la API se ejecutan con PostgreSQL de pruebas:
docker compose -f compose.test.yaml build migrate-test api-test
docker compose -f compose.test.yaml up -d --wait db-test
docker compose -f compose.test.yaml run --rm migrate-test
docker compose -f compose.test.yaml run --rm api-test
docker compose -f compose.test.yaml down -v
```

Para levantar producción local después de las verificaciones:

```bash
docker compose up -d --build api web
```

## Qué incluye

- CRUD frontend de Empleados con listado, búsqueda, estados, fichas, registro, edición y confirmaciones.
- Habilitación/deshabilitación técnica con advertencia para empleados inactivos.
- Permisos: interfaz solo ADMIN/GTE_OPE; rutas del backend ya están protegidas.
- Diseño con tokens Figma TrackOn; responsive tablet y móvil.
- Nuevas pruebas de API, lógica de formulario, interfaz y proyecciones de backend.
- Ajuste de **dos campos de selección** en el repositorio de Empleados: `habilitadoComoTecnico` en `listarEmpleados` y `buscarEmpleadoPorId`. No migra ni modifica Prisma.
- Integración con `App.tsx`, `Sidebar.tsx` y `MainLayout.tsx`.

El formulario de personal **no crea cuentas de usuario**; eso le corresponde a Administración. Los nombres del empleado y su documento siguen las validaciones de Zod del backend.

## Git y PR separado

Después de verificar:

```bash
git diff --check
git add apps/api/src/modules/empleados/empleados.repository.ts apps/api/test/empleados.proyeccion.test.ts
git commit -m "fix(empleados): exponer habilitación técnica en consultas"
git add apps/web/src/features/empleados apps/web/src/shared/styles/empleados.css \
        apps/web/src/App.tsx apps/web/src/shared/layout/Sidebar.tsx \
        apps/web/src/shared/layout/MainLayout.tsx
git commit -m "feat(empleados): implementar gestión de personal y diseño responsive"
git add apps/web/test/EmpleadosManager.test.tsx apps/web/test/EmpleadosListado.test.tsx apps/web/test/empleados.api.test.ts apps/web/test/empleados.form.test.ts
git commit -m "test(empleados): cubrir formularios y operaciones"
git status --short
git push -u origin feature/empleados
```

Abrir PR `feature/empleados` → `dev` y comprobar GitHub Actions + SonarQube (cobertura de código nuevo >=80%). No agregar `trackon-empleados/`, `.respaldo-empleados/` ni ZIP al commit.

**Nota:** no se han ejecutado Vitest/build completos en el entorno de generación, al no estar disponible el monorepo de TrackOn con node_modules. Ejecutarlos localmente antes del push y corregir cualquier fallo de integración.
