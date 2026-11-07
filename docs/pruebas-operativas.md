# Comprobación local de TrackOn

Las vistas de materiales, intervención por equipo, evidencias, dashboard, agenda,
usuarios y auditoría consumen la API. Se mantiene la estructura visual de Equipos.
El dashboard usa métricas del servidor y el día de Managua. La agenda muestra
visitas programadas; la duración de visitas y detección de solapamientos todavía
requieren un modelo de horarios antes de poder ofrecer disponibilidad fiable.

## Datos de prueba

Los datos salen de `apps/api/prisma/seed-nicaragua.ts`: 20 empresas nicaragüenses reales
(SEVASA, Comtech, Conico, SICSA, eTech, Telmovil, CLIMERSA, Climatec, La Colonia,
PriceSmart, Vivian Pellas, Bautista, InterContinental, Colonial Granada, Selva Negra,
Nuevo Carnic, Centrolac, Eskimo, Tip Top y CCN) con sus ubicaciones, equipos e historia
operativa. Detalle, fuentes y límites en [datos de prueba](datos-prueba-nicaragua.md).

El cargador reinicia la base de negocio y conserva las cuentas locales con su contraseña
actual. Rechaza `NODE_ENV=production` y una base que no sea local.

```bash
TRACKON_ALLOW_SEED_DATA=true pnpm seed:datos
```

Para las pruebas de notificaciones de esta guía usa `administrador` y `tecnico` en dos
sesiones privadas; si necesitás un tercer perfil, creá el usuario desde
**Administración → Usuarios y permisos**.

## Prueba de notificaciones y ejecución

1. Abre `http://localhost:8080` e inicia sesión como `administrador` con el archivo local.
   Después de actualizar los contenedores, recarga con `Ctrl+Shift+R`.
2. En Órdenes, pulsa **Nueva orden** y crea una solicitud de prueba del cliente
   del listado. Cada fila muestra los iconos **Ver, Editar, Asignar y Desactivar**, con
   su nombre visible y ayuda al pasar el cursor.
   Estas acciones abren ventanas sobre el listado y conservan sus filtros.
   Editar cambia solicitud, prioridad y programación. Las órdenes en revisión
   o finalizadas no admiten edición; Asignar requiere una orden pendiente.
3. En otra sesión privada entra como `tecnico` (o el usuario que crees). Edita la solicitud como
   administrador. En esa otra sesión, abre la campana y pulsa **Actualizar**:
   debe aparecer el aviso de edición. Al pulsarlo baja el contador, se abre
   **Ver** de esa orden y la lectura permanece después de recargar.
4. En otra sesión entra como `tecnico`. Como administrador, usa
   el icono **Asignar** y selecciona una cuadrilla. Como técnico, abre la
   campana, pulsa **Actualizar** y abre el aviso de asignación. Desde **Ver**,
   indica un motivo y pulsa **Iniciar trabajo**. El administrador recibe
   el nuevo aviso. El usuario que realiza la operación no recibe su propio aviso.
5. Para probar el flujo completo, registra diagnóstico y resultado, un servicio
   y consumo de material. Adjunta JPG, PNG, WebP o PDF hasta 8 MB. Espera el estado
   DISPONIBLE antes de enviar a revisión. Una carga fallida permite reintentar.
6. Como administrador, abre EN_REVISION, acepta cada evidencia vigente, indica un
   motivo y pulsa **Cerrar orden**.
   Si una evidencia requiere corrección, recházala con motivo y devuelve la orden
   a ejecución. El técnico puede cargar un reemplazo conservando el historial.
7. Para terminar una prueba sin completar trabajo técnico, usa
   el icono **Desactivar** y confirma con un motivo. La orden pasa a **CANCELADA**,
   conserva su historial, finaliza la asignación y avisa a los destinatarios.
   No se permite desactivar órdenes en revisión o finalizadas.
8. Comprueba los avisos en la otra sesión y las métricas del dashboard.
   El contador se consulta cada 30 segundos y al volver a la pestaña; la bandeja
   consulta los avisos al abrirla y con **Actualizar**. No es una entrega push
   por WebSocket ni correo.
9. Como administrador, comprueba Auditoría. Ediciones de órdenes, cambios de
   estado, asignaciones, registros técnicos, cargas/revisiones y cambios de
   usuarios registran actor.

## Procesamiento asíncrono

Express 5 utiliza handlers asíncronos y Prisma con el adaptador PostgreSQL.
Consultas, archivos y hashes de evidencias usan operaciones asíncronas;
contraseñas usan scrypt asíncrono. Las operaciones críticas usan transacciones
serializables y control de versión: un conflicto devuelve 409 para actualizar
los datos, en lugar de repetir silenciosamente una mutación.
La notificación se persiste dentro de la transacción del evento para evitar
avisos de operaciones revertidas. El frontend bloquea envíos mientras trabaja y
descarta respuestas de consultas anteriores al cambiar filtros o desmontarse.
La interfaz de almacenamiento permite sustituir el volumen local por un servicio
de objetos. Procesos futuros de correo, exportaciones o análisis pesado deberán
usar una cola durable y consumidores con reintentos; no hay una cola externa
instalada en esta entrega.

## Verificación y SonarCloud

```bash
pnpm build
pnpm lint
pnpm --dir apps/web test:coverage
docker compose -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from api-test api-test
```

La base de pruebas es PostgreSQL aislado, distinta de la demo local.
El escenario `flujo-operativo.integration.test.ts` comprueba permisos,
asignación, ejecución, datos históricos, carga inválida y reintento, descarga,
revisión, bloqueo de cierre incompleto, cierre, notificaciones y auditoría.
También comprueba edición parcial, permisos, conflictos de versión, dos ediciones
simultáneas, operaciones sin cambios y lectura de avisos restringida al destinatario.

`pnpm sonar` analiza `NuppyOz_TrackOn` y espera su Quality Gate.
Necesita `SONAR_TOKEN` en el entorno o en `.env.sonar.local` y ambos reportes LCOV
locales. La calidad publicada anteriormente en SonarCloud no valida los cambios
que aún no se hayan enviado al scanner. El análisis nuevo queda pendiente hasta
que el token esté disponible.

## Resultado local del 10 de octubre de 2026

- API: 181 pruebas aprobadas en 17 archivos, con PostgreSQL aislado y cobertura.
- Frontend: 243 pruebas aprobadas en 28 archivos, con cobertura; compilación y lint aprobados.
- Chromium: ocho comprobaciones aprobadas, sin errores de JavaScript:
  lectura persistente y navegación desde el aviso, cinco vistas con datos reales,
  dashboard móvil sin desbordamiento y navegación del técnico según su rol.
- Contenedores de API, web y PostgreSQL saludables en `http://localhost:8080`.
- Demo cargada en la base local; `.demo/resultado-navegador.json` y
  `.demo/capturas/` contienen el resultado y las capturas de la revisión.
- Filtros: búsqueda automática al escribir (250 ms), selectores inmediatos y
  limpieza en Equipos, Servicios, Materiales, Cuadrillas, Órdenes, Clientes,
  Empleados y Administración. Las respuestas de consultas anteriores se
  descartan. Chromium verificó los ocho listados con datos reales, las once
  vistas con preferencias de sistema claras y oscuras, y Órdenes en móvil.
  Resultado: `.demo/revision-filtros-final.json`, sin errores de JavaScript.
- Tema claro explícito para mantener coherentes los textos de Bulma con los
  fondos del diseño, incluso cuando el sistema operativo utiliza modo oscuro.
- Texto secundario unificado en `#454B55`, reemplazando `#666B74` y `#666B73`.
  Chromium comprobó contraste mínimo 7:1 en los textos secundarios revisados
  de once vistas, con preferencias del sistema claras y oscuras.
- Órdenes: iconos visibles de consulta, edición, asignación y desactivación en
  cada fila, con nombre y ayuda. Ventanas compactas y filtros conservados.
  Ver presenta el resumen y un mensaje sobre el siguiente paso; trabajo e
  historial se despliegan en la misma ventana. Los cambios de estado usan
  botones concretos: Publicar orden, Iniciar trabajo, Enviar a revisión,
  Devolver a ejecución y Cerrar orden. Edición con control de versión;
  desactivación con motivo e historial.
- Notificaciones: prueba real con administrador, gerente y técnico sobre la
  nueva OT-10 del cliente del listado; edición, asignación, ejecución, lectura persistente
  y cancelación comprobadas. La OT-10 quedó CANCELADA, sin asignación activa.
  Ocho comprobaciones de navegador y cuatro de revisión final aprobadas,
  incluyendo las acciones en móvil, ventanas centradas, devolución del foco
  y errores visibles con datos conservados para reintentar, sin errores de
  JavaScript. Resultado: `.demo/revision-acciones-notificaciones.json`.
- Revisión con iconos: siete comprobaciones de navegador y cinco de revisión
  final aprobadas sobre la
  nueva OT-12 demo. Edición, asignación, inicio de trabajo con botón directo,
  notificaciones y desactivación comprobados; acciones de mutación bloqueadas
  después de cancelar; consulta en móvil sin desbordamiento ni errores de
  JavaScript. Los cuatro iconos ocupan una fila en escritorio y sus botones
  miden al menos 44 por 44 píxeles en móvil. Resultado:
  `.demo/revision-iconos-ordenes.json`.
- SonarCloud de estos cambios pendiente: token de análisis no disponible.
