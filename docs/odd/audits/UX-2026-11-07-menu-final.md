# Auditoría UX/UI — los cuatro últimos menús del menú izquierdo

**Fecha:** 7 de noviembre de 2026
**Rama auditada:** `dev` @ `418b121` (merge de `feat/ui-armonia-navegacion`, PR #28)
**Superficie:** Finanzas y rentabilidad · Recursos humanos · Administración y seguridad · Inteligencia y control
**Método:** app real levantada en `laptoptrabajo` (API `:3000` + `vite preview` `:5173`), datos de prueba con clientes reales de Nicaragua, capturas a 1440×900 y 390×844, `axe-core 4.10.2`, medición de DOM (`getBoundingClientRect`, `getComputedStyle`, `scrollHeight`) y contraste calculado sobre la página renderizada.
**Veredicto:** la sección se puede mostrar a un cliente, pero **no se puede entregar como producto terminado**. Hay un problema de confianza (permisos que la pantalla promete y el servidor no aplica), un problema de contraste que afecta a todos los botones primarios y un problema de navegación que obliga a cinco niveles para llegar a un comprobante.

> **Actualización (misma fecha):** se aplicaron las tandas A y C. El estado de cada hallazgo está en la sección 9; P1-2 (cinco niveles de navegación) y P2-9 (densidad) siguen abiertos a propósito, porque mueven la estructura y necesitan tu aprobación.

---

## 1. Resumen en cinco puntos

1. **La pantalla "Roles y permisos" no dice la verdad.** Lista permisos escritos a mano en el componente y cierra con "Los permisos se validan en la API en cada solicitud", pero `authorize()` sólo compara el rol. El arreglo `permisos` de cada usuario se guarda y nunca se evalúa.
2. **El botón primario falla contraste AA:** blanco `#fff` sobre `#129fdc` = **2,99:1**. Es el mismo componente en "Registrar empleado", "Crear cuadrilla", "Registrar comprobante" y el resto del producto.
3. **La sección financiera tiene cinco niveles de navegación.** Captura del 7/11: del borde superior al título "Comprobantes" hay 335 px de pestañas —cuatro filas— sin contar la barra lateral ni la migaja.
4. **Los tableros muestran IDs internos como identidad del cliente** ("Cliente #20") y los importes salen en dos formatos distintos en la misma sesión (`C$43,620` y `C$ 131000.00`).
5. **El menú esconde 821 px de navegación** cuando se abren los ocho grupos, con `scrollbar-width: none` y `::-webkit-scrollbar{display:none}`: no hay ninguna señal de que haya más abajo.

---

## 2. Alcance y método

| Qué | Cómo |
| --- | --- |
| Pantallas | 10 rutas: `/inteligencia/origen/finanzas`, `/empleados`, `/cuadrillas`, `/administracion`, `/auditoria`, `/inteligencia/comercial`, `/inteligencia/financiero`, `/inteligencia/logistico`, `/inteligencia/calidad`, `/inteligencia/operacion/resumen` |
| Anchos | 1440×900 (escritorio) y 390×844 (móvil, `isMobile`) |
| Accesibilidad | `axe-core 4.10.2`, reglas completas, sólo violaciones, en cada ruta |
| Contraste | calculado sobre el color y el primer fondo opaco del ancestro, no sobre tokens |
| Densidad | `scrollHeight` del `main` y del documento por ruta |
| Objetivos táctiles | censo de todo control visible con `width` u `height` < 24 px |
| Estados | censo de `aria-busy`, `[role=status]`, `[aria-live]`, skeletons y `focus-visible` |

Los números de esta auditoría son de la app con **datos de prueba nuevos** (20 empresas nicaragüenses reales, 156 órdenes, 121 comprobantes). Las capturas y el JSON de medición están en `evidencia/`.

---

## 3. Datos de prueba: qué se cambió

Los seeds de demostración (`seed-demo.ts`, `seed-demo-completo.ts`, `seed-dev-data.ts`) se eliminaron. Sus clientes eran inventados ("Clínica Central Sur", "Frío Centro Nicaragua S.A.") y no servían para una revisión con el cliente delante.

En su lugar, `apps/api/prisma/seed-nicaragua.ts` carga **20 empresas nicaragüenses reales**, con razón social, teléfono, sitio y dirección tomados de sus propios sitios, de Google Maps y de directorios públicos (noviembre de 2026). Detalle completo en [`docs/datos-prueba-nicaragua.md`](../datos-prueba-nicaragua.md).

- **Distribuidores de tecnología y climatización:** SEVASA (Altamira y Carretera a Masaya km 13.4), Comtech (Altamira D'Este 589 y bodega Juan Pablo II), Conico (Altamira y Las Brisas), SICSA, eTech (RUC publicado `J0310000013918`), Telmovil (El Güegüense, Metrocentro PA-10A, Multicentro Las Américas), CLIMERSA, Importaciones Climatec.
- **Operaciones que dependen de frío:** Supermercados La Colonia (Sur y Veracruz), PriceSmart, Hospital Vivian Pellas, Hospital Bautista, Real InterContinental, Hotel Colonial Granada, Selva Negra, Nuevo Carnic, Centrolac, Eskimo, Tip Top y CCN (RUC publicado `J0310000001960`).

**Qué es real:** nombre, sector, teléfono, correo, sitio y dirección; los dos RUC publicados. **Qué no es real:** tarifas, consumos, órdenes, comprobantes, costos, inventario, nombres del personal de MULTICAS y proveedores. Los RUC no publicados son números de trabajo y el perfil comercial lo advierte: hay que validarlos contra la constancia de la DGI antes de facturar.

**Volumen cargado y verificado en base:** 20 clientes · 28 ubicaciones · 61 equipos · 16 empleados · 5 cuadrillas · 156 órdenes (121 cerradas, 11 en revisión, 9 asignadas, 8 en ejecución, 7 pendientes) · 60 cotizaciones (28 enviadas, 16 aprobadas, 12 borrador, 4 rechazadas) · 121 comprobantes · 34 comprobantes emitidos en los últimos 30 días por C$350 360.

Dos correcciones que hicieron falta para que los datos fueran creíbles delante del cliente:

- Quedaban **102 cuentas `demo.tecnico*` y 102 empleados `DEMO-EMP-*`** de la carga anterior. El seed ahora los borra por prefijo: la app mostraba "demo.tecnico100" en *Usuarios y permisos* y 116 empleados en *Empleados*.
- **La facturación del mes salía en C$0** porque todas las visitas cerradas eran de hace 4 meses o más. Ahora parte de las visitas del último mes están cerradas y el resumen muestra `C$43,620` con 121 servicios finalizados (5 hoy).

---

## 4. Hallazgos

### P0 — bloquea la entrega

#### P0-1 · La pantalla de permisos describe un control que no existe
`apps/web/src/features/administracion/RolesPermisos.tsx:6-10` contiene un objeto `permisos` escrito a mano por rol; la pantalla nunca lee `usuario.permisos`, que sí existe en base (`migrations/20261021120000_permisos_por_usuario`) y que la API devuelve en el login (`auth.service.ts:62`). El servidor autoriza **sólo por rol**: `middlewares/authorize.ts` compara `req.auth.usuario.rol.cod` contra la lista permitida y no consulta el arreglo `permisos` en ningún punto del backend.

Consecuencia: la frase de cierre de la pantalla —"Los permisos se validan en la API en cada solicitud"— es falsa, y un administrador puede quitar permisos a un usuario sin que cambie nada. Es el hallazgo más grave porque es una promesa de seguridad visible en la interfaz.

**Arreglo:** una de dos, y hay que elegir. (a) Implementar `authorize` por permiso (`requirePermission('AUDITORIA')`) y que la pantalla lea y edite `usuario.permisos`; o (b) retirar la pestaña "Roles y permisos", dejar la lista de roles como texto informativo y quitar la frase. Mantener la pantalla tal como está es el único escenario inaceptable.

### P1 — hay que corregirlo antes de mostrar la sección

#### P1-1 · El botón primario no alcanza AA (2,99:1)
Medido en `/empleados` y `/cuadrillas`: texto `rgb(255,255,255)` sobre fondo `rgb(18,159,220)` = **2,99:1**; AA para texto normal exige 4,5:1. `axe` lo marca como *serious* en ambas rutas y afecta a todo `Button variant="primary"`.

**Arreglo:** bajar el azul a `#0b7ab0` (4,6:1 con blanco) o pasar el texto a `#06202e`. Es un cambio de token, no de pantalla.

#### P1-2 · Cinco niveles para llegar a un comprobante
`/inteligencia/origen/finanzas` apila: barra lateral → migaja "TrackOn › IA y negocio" → pestañas del workspace (Operación / Indicadores de negocio / Registros de origen / Cobertura de los datos) → pestañas de sección (Contratos / Registros financieros / Registros logísticos / Registros de calidad) → pestañas de fuente (Comprobantes / Servicios realizados / Cobros / Costos) → migaja "Inteligencia / Registros financieros" → título. El mismo destino aparece en el menú ("Finanzas y rentabilidad → Registros financieros"), en las pestañas del workspace y en el enlace "Comprobantes y cobros" del tablero financiero.

**Arreglo:** un nivel de pestañas por nivel de información. El menú "Finanzas y rentabilidad" debe ser la puerta única y el tablero financiero debe enlazar ahí, no duplicar la navegación dentro de Inteligencia.

#### P1-3 · Los tableros identifican al cliente con su ID interno
`IndicadoresComercialesPage.tsx:64` renderiza `Cliente #${row.clienteId}`; en calidad ocurre lo mismo en `IndicadoresCalidadPage.tsx:51` y `:122`. En otras filas de la misma tabla sí aparece `clienteNombre`: el dato está, se descarta.

**Arreglo:** resolver el nombre en la API (join) y usarlo siempre; el ID va en el enlace o en el detalle, nunca como etiqueta.

#### P1-4 · Dos formatos de importe en la misma sesión
Resumen general: `C$43,620` (separador de miles, sin decimales). Tableros: `C$ 131000.00` (espacio, sin separador, dos decimales) — `IndicadoresComercialesPage.tsx:25`. Comprobantes: `C$ 0.00`.

**Arreglo:** un formateador único (`Intl.NumberFormat('es-NI', { style:'currency', currency:'NIO' })`) en `shared/`. Cero decisiones locales por pantalla.

#### P1-5 · La lista de comprobantes no muestra el importe
`ComprobantesPage.tsx:94-100` tiene columnas Referencia, Cliente, Emisor, Emisión, **Saldo**, Estado y Acciones. Como casi todos los comprobantes están saldados, la columna dice `C$ 0.00` en todas las filas: la lista no comunica cuánto se facturó. El importe existe (`importeFinal`).

**Arreglo:** agregar "Importe" antes de "Saldo" y dejar el saldo como columna derivada.

#### P1-6 · El menú oculta navegación sin decirlo
Con los ocho grupos abiertos, `.erp-sidebar-scroll` mide 1546 px de contenido en 725 px visibles (821 px ocultos) y `erp-reference.css:79-86` fija `scrollbar-width: none` y `::-webkit-scrollbar { display: none }`. Cerrado, el menú ocupa exactamente 725 px: no hay margen para crecer (un grupo más lo desborda).

**Arreglo:** dejar visible una barra fina dentro del panel oscuro, o mostrar los grupos como acordeón exclusivo (uno abierto a la vez) y ganar el espacio.

#### P1-7 · Título duplicado y jerarquía de encabezados inconsistente
`MainLayout.tsx:86` inyecta `<h1 class="sr-only">{etiquetas[seccion]}</h1>` para todas las rutas; las pantallas de Inteligencia añaden su propio `<h1>` (`ModuleHeader`), y las de Empleados, Cuadrillas, Auditoría y Usuarios usan `<h2>`. Resultado medido: **dos `h1`** en las cinco rutas de Inteligencia y "Empleados"/"Auditoría"/"Usuarios y permisos" repetidos como `h1` oculto + `h2` visible.

**Arreglo:** el shell no debe declarar el título de la página. Un `h1` visible por pantalla, `h2` para secciones, y una regla de lint que lo impida.

### P2 — fricción real, arreglable en una tanda corta

| # | Hallazgo | Evidencia |
| --- | --- | --- |
| P2-1 | ~~Fechas ambiguas en filtros~~ **Corregido en la revisión:** el campo se ve `07/10/2026, 09:23 p.m.` y ese valor **es** 7 de octubre en `dd/mm`, que es lo correcto para `es-NI`; el rango de 30 días lo confirma. Queda un detalle real: la hora se muestra en formato de 12 h con `p. m.` y el formato del campo lo decide el idioma del sistema operativo del usuario, no la app (con un equipo en inglés vería `mm/dd`). | captura `int-comercial` + lectura del `input.value` |
| P2-2 | "IA y negocio" promete un asistente que no existe: tarjeta completa con "El asistente no está configurado" y botón deshabilitado en los cuatro tableros. | `int-comercial`, `int-financiero`, `int-logistico`, `int-calidad` |
| P2-3 | Auditoría sin filtros (ni fecha, ni actor, ni acción) y con datos crudos: entidad `ORDEN_TRABAJO`, registro `12`. | `AuditoriaManager.tsx:21` |
| P2-4 | El botón "Limpiar" se estira a toda la fila de filtros: 895 px en Usuarios, 785 px y en segunda línea en Cuadrillas. Parece acción primaria sin serlo. | `UsuariosManager.tsx:43`, `CuadrillasManager.tsx:128` |
| P2-5 | Cuadrillas es master-detail sin señal: el panel de integrantes queda bajo el pliegue y el ítem elegido sólo cambia un borde. | `rh-cuadrillas` |
| P2-6 | `<select>` de "agregar integrante" sin etiqueta: `axe` *critical* `select-name` (1). | `CuadrillasManager.tsx:131` |
| P2-7 | Objetivos menores a 24 px: enlaces de referencia de 17 px de alto (25 en comercial, 21 en calidad) y el menú de acciones de comprobantes de 21 px. WCAG 2.2 (2.5.8) pide 24×24. | censo DOM |
| P2-8 | Contraste secundario bajo: avatar de iniciales `#53758a` sobre `#dbeef7` = **4,11:1**; enlaces de origen `#087db5` sobre `#f5f6f8` = **4,21:1**; antetítulo "IA y negocio" 12 px al mismo 4,21. | medición de contraste |
| P2-9 | Densidad: logístico mide 5 194 px (6 pantallas), calidad 4 685, financiero 3 550. La tabla de nueve métricas repite los cuatro KPIs de arriba y dice "Según el periodo consultado" siete veces. | `scrollHeight` |
| P2-10 | "Conversión 50,00 %" con lectura "20 de 40" sin explicar qué son esos 40 (¿decididas? ¿enviadas?). | `int-comercial` |
| P2-11 | "Inteligencia y control" agrupa cuatro tableros y una pantalla operativa ("IA y negocio"), y la etiqueta oculta `h1` de las cinco rutas es justamente "IA y negocio". | `Sidebar.tsx:211`, `MainLayout.tsx:30` |
| P2-12 | Usuarios no pagina: el listado renderiza todas las cuentas. Con los 102 usuarios demo que quedaban de la carga anterior la página medía **39 072 px en móvil**; con las 2 cuentas actuales no se nota, pero el código no tiene tope. | censo móvil + `UsuariosManager.tsx:44` |
| P2-13 | "Administración y seguridad" mide 68 px de alto contra 47 px de los otros grupos: el rótulo parte en dos líneas y rompe el ritmo. | medición de menú |

### P3 — pulido

- "1 integrantes · Líder: …" (`CuadrillasManager.tsx:114`). Concordancia rota.
- "En revision" en Operación: `nombreEstado` sólo capitaliza, no repone tildes (`OperacionInteligentePage.tsx:17`).
- Tres rótulos para lo mismo: migaja "Recursos › Empleados", antetítulo "RECURSOS · PERSONAL" y título "Empleados".
- La confirmación de desactivar un acceso es un `div role="dialog"` en línea, sin foco atrapado ni Escape (`UsuariosManager.tsx:47`), cuando existe `shared/Modal.tsx`.
- Paginación sin total: "Página 1 · 25 por página" en los tableros; "Página 1" en auditoría.

---

## 5. Lo que está bien (y conviene no tocar)

- **Los estados de la tabla compartida están resueltos**: `DataTable` trae carga con `role="status"`, error con "Reintentar", vacío con título y descripción, y paginación con `aria-label` (`erp-ui/components.tsx:70-126`). No hay pantallas en blanco cuando la API falla.
- **La cobertura de datos se declara**: cada tablero avisa si el período está completo o parcial y muestra el corte evaluado. Es una decisión editorial correcta y poco común.
- **Las tasas muestran su denominador** ("20 de 40"), que es exactamente lo que hay que hacer en un tablero.
- **El móvil no se rompe**: a 390 px las tablas de Empleados y Usuarios se convierten en fichas con `data-label`, sin desborde horizontal (`desbordeX: 0` en las cuatro rutas medidas).
- **El menú tiene iconos, `aria-current` y grupos con `aria-label`**; la navegación por teclado llega al menú antes que al contenido.

---

## 6. Plan de corrección

**Tanda A — confianza y legibilidad (1 sesión, sin mover la línea gráfica)**
Contraste de primario, avatares y enlaces · un formateador de dinero · fechas `dd/mm/aaaa` en filtros · columna Importe en comprobantes · nombres en lugar de `Cliente #N` · `select` con etiqueta · objetivos a 24 px · "1 integrante", "En revisión".

**Tanda B — navegación (1–2 sesiones)**
Quitar la barra de pestañas duplicada del workspace de Inteligencia y dejar una sola ruta por pantalla · barra de scroll visible en el menú · grupos que no quiebren a dos líneas · un solo `h1` por pantalla.

**Tanda C — permisos y IA (decisión de producto)**
Implementar `authorize` por permiso o retirar la pantalla · paginación de usuarios · filtros de auditoría · configurar el asistente o retirar la tarjeta y renombrar "IA y negocio".

---

## 7. Lo que no verifiqué

- **Permisos en la práctica**: no probé que un ADMIN sin `permisos` reciba 403, porque no hay pantalla ni API que edite `usuario.permisos` desde la UI. El hallazgo P0-1 se apoya en el código de `authorize.ts`, no en una prueba de extremo a extremo.
- **Lector de pantalla real** (NVDA/VoiceOver): sólo `axe` y el árbol de accesibilidad del navegador.
- **Lighthouse/INP**: no se midió rendimiento; las pantallas de 5 000 px son un problema de densidad, no de tiempo de carga.
- **Impresión** de comprobantes e informes: fuera del alcance de esta revisión.
- **El asistente de IA** con clave configurada: la respuesta del proveedor no se probó (no hay clave en el entorno local).

---

## 8. Evidencia

`evidencia/` contiene el JSON de medición (`informe.json`, `medidas.json`, `dashboard.json`) y las capturas:

`00-sidebar.png`, `02-menu-ultimos-4.png`, `01-dashboard.png`, `rh-empleados.png`, `rh-cuadrillas.png`, `adm-usuarios.png`, `adm-auditoria.png`, `int-comercial.png`, `int-financiero.png`, `int-logistico.png`, `int-calidad.png`, `int-operacion.png`, `fin-registros.png`, y las versiones `-viewport.png` y las cuatro móviles (`movil-*.png`).

---

## 9. Estado de las correcciones

**Tanda A — confianza y legibilidad (aplicada).**

| Hallazgo | Qué se hizo | Evidencia |
| --- | --- | --- |
| P1-1 contraste del primario (2,99:1) | Token nuevo `--tk-blue-cta: #0b7ab0` sólo para fondos con texto blanco (hover `#08658f`). El azul de marca `#129fdc` sigue igual en bordes, focos e iconos. | medido de nuevo: **4,75:1** |
| P2-8 avatar 4,11:1 y enlaces 4,21:1 | Avatar a `#3f5d70` (5,84:1); `--erp-color-primary-600` a `#066A9C` (5,47:1 sobre `#f5f6f8`). | medición en la app |
| P1-4 dos formatos de importe | `shared/formato.ts` con `Intl.NumberFormat('es-NI', { currency: 'NIO' })`; comercial, financiero y comprobantes lo usan. Formato único: `C$131,000.00`. | `shared/formato.ts`, 4 pantallas |
| P1-3 `Cliente #N` | Los tableros comercial y de calidad resuelven el nombre con el directorio de clientes y caen al id sólo si el cliente no existe. | capturas nuevas |
| P1-5 comprobantes sin importe | Columna **Importe** antes de **Saldo**, alineada a la derecha. | `ComprobantesPage.tsx` |
| P2-6 `select` sin etiqueta (axe critical) | Etiqueta visible "Agregar integrante" + `aria-label` en el selector de Cuadrillas. | axe sin `select-name` |
| P2-7 objetivos < 24 px | Enlaces y botones dentro de celdas con `min-height: 24px` e `inline-flex`; la fila no se mueve. | regla en `erp-reference.css` |
| P2-4 botón "Limpiar" estirado | `.filters > button` con ancho intrínseco y `justify-self: start`. Ya no ocupa 895 px. | captura de Usuarios |
| P3 "1 integrantes", "En revision" | Plural correcto y mapa de estados con tildes (`En ejecución`, `En revisión`). | `CuadrillasManager`, `OperacionInteligentePage` |

**Tanda C — permisos, paginación y auditoría (aplicada).**

| Hallazgo | Qué se hizo |
| --- | --- |
| P0-1 permisos que el servidor no aplica | La pantalla dejó de mostrar un mapa escrito a mano y la frase falsa. Ahora lista los perfiles reales, las cuentas de cada perfil y **los permisos registrados por usuario** que devuelve la API, y dice con todas las letras que el servidor autoriza por perfil y que los permisos por usuario todavía no restringen el acceso. **Sigue pendiente la decisión de producto:** implementar `requirePermission` o retirar la sección. |
| P2-12 usuarios sin paginación | 10 cuentas por página con "Página X de Y · N cuentas" y `aria-live`. |
| P2-3 auditoría sin filtros | Filtros de entidad, acción y rango de fechas (parámetros nuevos en `GET /api/auditoria`: `accion`, `desde`, `hasta`), entidades y acciones traducidas a lenguaje de negocio, y el registro con `#`. |
| P2-2 "IA y negocio" sin asistente | La tarjeta del asistente no se dibuja si el proveedor no está configurado. El ítem del menú pasa a **Operación del día** y la sección se llama **Inteligencia** en la migaja y en el encabezado oculto. |

**Sigue abierto (necesita decisión, no código):** P1-2 y la duplicación de pestañas de Inteligencia · P2-9 densidad de los tableros · P2-10 denominador de la conversión · P0-1 en su parte de backend · P2-1 en su parte de formato de hora.

**Límite de esta tanda:** los cambios se verificaron con `tsc` (api y web), la suite de pruebas web y axe en las rutas tocadas. La API de auditoría se probó con `curl` contra el servicio recompilado, no con pruebas automatizadas de integración (este equipo no tiene Docker para levantar la base de pruebas).
