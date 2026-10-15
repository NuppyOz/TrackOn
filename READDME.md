# TrackOn — Primer incremento de Órdenes de Trabajo

Este paquete fue elaborado usando como referencia el estado de `dev` del repositorio `NuppyOz/TrackOn` del 9 de octubre de 2026.

## Alcance entregado

- Crear órdenes desde una ubicación y cliente activos, con nombre y dirección históricos.
- Numeración generada por PostgreSQL y serializada en JSON como **texto** (BigInt).
- Listar órdenes por estado, texto y paginación.
- Consultar detalle e historial.
- Cambiar estados con motivo, autorización y control de concurrencia mediante versión.
- Permisos: ADMIN/GTE_OPE gestionan; TEC consulta.
- Página web de órdenes incorporada a Sidebar y App.
- Pruebas de validación, reglas de negocio, persistencia simulada, HTTP y frontend.

**No incluido todavía:** asignación de cuadrillas y técnicos, equipos intervenidos, diagnóstico, materiales, presupuesto ni evidencias. Para que la transición `PENDIENTE → ASIGNADA` sea válida debe existir una asignación vigente. Esta es la base de ese flujo, no un ERP concluido.

## Integración

1. En tu máquina, desde la raíz del repositorio, verifica `git status` y trabaja desde una nueva rama basada en `dev`:

```bash
git switch dev
git pull --ff-only origin dev
git switch -c feature/ordenes-mvp
```

2. Descomprime el ZIP **en la raíz del repositorio**, conservando las rutas `apps/...`:

```bash
unzip ~/Descargas/trackon-ordenes-mvp.zip -d .
chmod +x instalar.sh
./instalar.sh
```

3. Verifica el diff antes de ejecutar. El instalador agrega únicamente las rutas de órdenes a `apps/api/src/app.ts`, `apps/web/src/App.tsx`, `apps/web/src/shared/layout/Sidebar.tsx` y adapta la prueba de App para navegación.

```bash
git status --short
git diff --check
```

4. Ejecuta **primero** las pruebas nuevas y verificaciones de TypeScript:

```bash
pnpm --dir apps/api exec vitest run test/ordenes.schema.test.ts test/ordenes.service.test.ts test/ordenes.repository.test.ts test/ordenes.http.test.ts
pnpm --dir apps/api run typecheck
pnpm --dir apps/web exec vitest run test/OrdenesManager.test.tsx test/ordenes.api.test.ts
pnpm --dir apps/web run build
pnpm --dir apps/web run lint
```

5. Cuando lo anterior pase, ejecuta las suites completas y reportes reales LCOV para SonarQube:

```bash
pnpm --dir apps/api run test:coverage
pnpm --dir apps/web run test:coverage
```

6. Para ejecución con Docker y base de desarrollo, el catálogo de estados debe existir. La migración **no ejecuta automáticamente el seed**. Con DATABASE_URL de desarrollo cargada (no de test), ejecutar:

```bash
pnpm --dir apps/api exec prisma db seed
```

7. Comprueba el Quality Gate con PR pequeño a `dev`, manteniendo la configuración actual. **No se ha ejecutado CI ni SonarQube en el entorno de preparación del paquete**; las pruebas y el porcentaje deben validarse con los comandos anteriores.

## Endpoints nuevos

- `GET /api/ordenes?pagina=1&limite=25&estado=PENDIENTE`
- `GET /api/ordenes/:id`
- `POST /api/ordenes`
- `PATCH /api/ordenes/:id/estado`

Ejemplo de alta:

```json
{"ubicacionId":3,"solicitud":"Revisar unidad de refrigeración","prioridad":"ALTA"}
```

Ejemplo de cambio:

```json
{"estado":"CANCELADA","motivo":"Cancelación solicitada por el cliente"}
```

## Siguiente incremento

Implementar asignaciones de cuadrilla/técnico y equipos intervenidos en una segunda rama/PR; después diagnóstico y evidencias. Conserva una nueva cobertura ≥80%, duplicación de código nuevo ≤3% y no eleves complejidad cognitiva de funciones sin justificar.
