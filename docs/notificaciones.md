# Notificaciones

## API disponible

- `GET /api/notificaciones?limite=20&cursor=123` devuelve `{ items, noLeidas, nextCursor }`. El límite permitido es 1–100. El cursor corresponde al último `id` devuelto.
- `GET /api/notificaciones/unread-count` devuelve `{ noLeidas }` sin descargar la colección.
- `PATCH /api/notificaciones/:id/leida` marca como leída una notificación del usuario autenticado. Repetir la solicitud conserva el resultado y no modifica el contador dos veces.

Todas las rutas requieren `Authorization: Bearer <accessToken>`. El usuario y sesión se derivan del JWT y se contrastan con la tabla `Sesion`; no se acepta un `usuarioId` indicado por el cliente.

## Interfaz

La campana está en la barra superior de `apps/web/src/App.tsx`; su popover está implementado en `apps/web/src/features/notificaciones/NotificationsBell.tsx`. Con una sesión restaurada y válida consulta el contador. Al abrirla solicita la primera página y permite cargar más mediante cursor. Marcar una notificación como leída actualiza la fila y el contador localmente. La interfaz tiene estados vacíos, cargando, error y reintento. Sin sesión muestra un aviso para explicar por qué la bandeja personal no puede consultarse. No hay una página independiente `/notifications` en el router actual.

El cliente HTTP está en `apps/web/src/features/notificaciones/notificaciones.api.ts`. En el backend, las rutas se registran en `apps/api/src/app.ts` y se implementan bajo `apps/api/src/modules/notificaciones/` (rutas, controller, servicio, repositorio y schema). Todas requieren autenticación.

## Límite funcional actual

El repositorio no tiene todavía operaciones de órdenes/asignaciones que produzcan eventos de notificación, ni una clave persistente de idempotencia en `Notificacion`. La bandeja puede mostrar notificaciones existentes en PostgreSQL, pero ningún evento de negocio nuevo las crea todavía. Al integrar esos módulos, crear cada notificación en la misma transacción PostgreSQL de la operación pequeña o introducir un Outbox con una migración revisada. No exponer un endpoint público para crear notificaciones arbitrarias.
