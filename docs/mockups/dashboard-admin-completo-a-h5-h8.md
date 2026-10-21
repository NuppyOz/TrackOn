# Mockup completo del administrador — TrackOn / MULTICAS

Contenido ficticio y autocontenido para generar la interfaz completa de A.1–A.4 y H.5–H.8 desde una única sesión ADMIN. Usar este documento como conjunto completo para el mockup; sus cifras sustituyen las del primer archivo de ejemplo. No ejecuta SQL, no cambia datos de TrackOn y no activa un modo demo en la aplicación.

## 0. Contrato visual y sesión del administrador

| Elemento | Contenido / comportamiento |
| --- | --- |
| Empresa / producto | MULTICAS · TrackOn |
| Usuario / rol | Andrea López · Administradora |
| Avatar | AL |
| Zona horaria | America/Managua |
| Fecha de corte | 20 octubre 2026, 18:00 |
| Período inicial | 1 octubre 2026, 00:00 → 20 octubre 2026, 18:00; límite final excluido |
| Moneda | NIO; dinero a dos decimales, stock a tres y valoración a nueve |
| Aviso persistente | DEMOSTRACIÓN · Datos ficticios |
| Barra superior | Logo, nombre de producto, campana con 12 sin leer, avatar, perfil y cerrar sesión; sticky top:0 con fondo opaco |
| Menú móvil | Drawer; la barra superior sigue visible al hacer scroll |
| Permisos | ADMIN puede ver, crear, editar y ejecutar las acciones permitidas por estado; registrar actor e historial |
| No simular seguridad | La vista previa del portal muestra sólo el cliente seleccionado. No atribuir acciones del administrador a una sesión de cliente |
| Diseño | Primary #129FDC / hover #087DB5; sidebar #2F254D; fondo #F5F6F8; superficies #FFFFFF; bordes #E4E3EA; texto #202124 / secundario #666B73 |
| Estados | Texto + icono + color. Éxito #2E7D32, aviso #ED9B16, error #C62828 |
| Variación de precios de servicios | 1320 / 1360 / 1400 / 1440 / 1480 NIO; media 1400, desviación poblacional 56.57 (4.04%). Costos/productos se comparan dentro de su categoría |
| Formato | Tablas primero, máximo cuatro tarjetas por módulo, acción principal única, acciones por fila en ⋯. Formularios por secciones; detalles con pestañas |

### Navegación de este administrador

| Grupo | Pantallas |
| --- | --- |
| Inicio | Resumen general / Centro operativo |
| Comercial A | A.1 Clientes · A.2 Cotizaciones y ventas · A.3 Catálogo y tarifarios · A.4 Administración del portal |
| Inteligencia H | H.5 Comercial · H.6 Financiero · H.7 Logístico · H.8 Calidad |
| Fuentes de indicadores | Contratos · Comprobantes · Cobros · Costos · Servicios realizados · Artículos · Movimientos · Compras/recepciones · Herramientas · Garantías · Casos · Correctivas |
| Contexto compartido | Órdenes, equipos y documentos se consultan como relaciones. Este mockup no redefine el negocio de B/C/D/E/F/G |

## 1. Inicio — todos los contenidos del dashboard

| Tarjeta principal | Valor | Acción |
| --- | --- | --- |
| Órdenes activas | 12 | Consultar órdenes abiertas |
| Órdenes pendientes | 2 | Ver pendientes |
| Servicios finalizados | 8 | Consultar cerradas |
| Facturación del período | C$16680.00 | Abrir H.6 |
| Cuentas por cobrar | C$2080.00 | Abrir comprobantes con saldo |
| Inventario crítico | 1 artículo | Abrir H.7 filtrado por stock bajo |

El Centro operativo existente puede mostrar sus cuatro KPIs: Sin asignar 2; En revisión 4; En ejecución 4 (1 urgente abierta en el conjunto); Cerradas hoy 4 (8 cerradas en total). Contexto: 16 atenciones programadas hoy y 12 órdenes abiertas. Los estados operativos usados aquí son los actuales del proyecto, sin introducir estados nuevos.

| Orden | Cliente | Servicio | Fecha programada | Prioridad | Estado |
| --- | --- | --- | --- | --- | --- |
| OT-2026-0001 | DEMO-CLI-001 | Limpieza de unidad interior | 2026-10-20T09:00:00-06:00 | MEDIA | CERRADA |
| OT-2026-0002 | DEMO-CLI-002 | Revisión técnica de climatización | 2026-10-20T10:00:00-06:00 | MEDIA | CERRADA |
| OT-2026-0003 | DEMO-CLI-003 | Mantenimiento preventivo básico | 2026-10-20T11:00:00-06:00 | MEDIA | CERRADA |
| OT-2026-0004 | DEMO-CLI-004 | Limpieza de condensador | 2026-10-20T12:00:00-06:00 | MEDIA | CERRADA |
| OT-2026-0005 | DEMO-CLI-005 | Mantenimiento de refrigeración comercial | 2026-10-19T13:00:00-06:00 | MEDIA | CERRADA |
| OT-2026-0006 | DEMO-CLI-006 | Limpieza de unidad interior | 2026-10-19T14:00:00-06:00 | MEDIA | CERRADA |
| OT-2026-0007 | DEMO-CLI-007 | Revisión técnica de climatización | 2026-10-19T15:00:00-06:00 | MEDIA | CERRADA |
| OT-2026-0008 | DEMO-CLI-008 | Mantenimiento preventivo básico | 2026-10-19T08:00:00-06:00 | MEDIA | CERRADA |
| OT-2026-0009 | DEMO-CLI-009 | Limpieza de condensador | 2026-10-20T09:00:00-06:00 | MEDIA | EN_REVISION |
| OT-2026-0010 | DEMO-CLI-010 | Mantenimiento de refrigeración comercial | 2026-10-20T10:00:00-06:00 | MEDIA | EN_REVISION |
| OT-2026-0011 | DEMO-CLI-011 | Limpieza de unidad interior | 2026-10-20T11:00:00-06:00 | MEDIA | EN_REVISION |
| OT-2026-0012 | DEMO-CLI-012 | Revisión técnica de climatización | 2026-10-20T12:00:00-06:00 | MEDIA | EN_REVISION |
| OT-2026-0013 | DEMO-CLI-013 | Mantenimiento preventivo básico | 2026-10-20T13:00:00-06:00 | MEDIA | EN_EJECUCION |
| OT-2026-0014 | DEMO-CLI-014 | Limpieza de condensador | 2026-10-20T14:00:00-06:00 | MEDIA | EN_EJECUCION |
| OT-2026-0015 | DEMO-CLI-015 | Mantenimiento de refrigeración comercial | 2026-10-20T15:00:00-06:00 | MEDIA | EN_EJECUCION |
| OT-2026-0016 | DEMO-CLI-016 | Limpieza de unidad interior | 2026-10-20T08:00:00-06:00 | MEDIA | EN_EJECUCION |
| OT-2026-0017 | DEMO-CLI-017 | Revisión técnica de climatización | 2026-10-20T09:00:00-06:00 | ALTA | PENDIENTE |
| OT-2026-0018 | DEMO-CLI-018 | Mantenimiento preventivo básico | 2026-10-20T10:00:00-06:00 | URGENTE | PENDIENTE |
| OT-2026-0019 | DEMO-CLI-019 | Limpieza de condensador | 2026-10-20T19:00:00-06:00 | MEDIA | ASIGNADA |
| OT-2026-0020 | DEMO-CLI-020 | Mantenimiento de refrigeración comercial | 2026-10-20T19:30:00-06:00 | MEDIA | ASIGNADA |

### Bloques del inicio

| Bloque | Contenido exacto |
| --- | --- |
| Requieren atención | OT-2026-0009, 0010, 0011 y 0012: Revisar. OT-2026-0017 y 0018: Asignar |
| Próximas atenciones | 19:00 · Hotel Jardines · OT-2026-0019; 19:30 · María Solís · OT-2026-0020 |
| Carga de cuadrillas | Norte 3 · Centro 3 · Sur 2 · Refrigeración 2 · Apoyo 2 · Reserva 0 órdenes activas; total12 |
| Cobertura operativa | 1 de 6 cuadrillas sin órdenes activas |
| Acciones frecuentes | Consultar órdenes; abrir agenda; registrar cliente; nueva cotización |
| Alertas | 1 artículo bajo mínimo; 1 herramienta con devolución vencida; 2 cotizaciones pendientes de decisión; 1 correctiva pendiente |
| Actividad reciente | Combinar el historial integral y las notificaciones; mostrar los últimos veinte eventos en orden descendente por fecha |
| Rango | Hoy / Semana / Mes / Rango. Mes corresponde al intervalo fijado arriba; los números se recalculan al filtrar |

## 2. A.1 — Gestión de clientes / CRM

Pantallas: listado, registrar, editar y detalle. KPIs: 20 clientes activos, 20 contactos principales, 20 ubicaciones y 15 clientes con ventas. Filtros: búsqueda por nombre/código/identificación; tipo persona; clasificación; estado. Paginación: 20 filas visibles, opción 10/20 por página.

| Cliente | Nombre / razón social | Tipo | Identificación ficticia | Clasificación | Teléfono ficticio | Correo | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DEMO-CLI-001 | Café Las Brisas | EMPRESA | DEMO-RUC-001 | REGULAR | +505 0000 0001 | compras01@example.com | Activo |
| DEMO-CLI-002 | Panadería El Molino | EMPRESA | DEMO-RUC-002 | REGULAR | +505 0000 0002 | compras02@example.com | Activo |
| DEMO-CLI-003 | Minimarket Los Pinos | EMPRESA | DEMO-RUC-003 | REGULAR | +505 0000 0003 | compras03@example.com | Activo |
| DEMO-CLI-004 | Farmacia La Plaza | EMPRESA | DEMO-RUC-004 | REGULAR | +505 0000 0004 | compras04@example.com | Activo |
| DEMO-CLI-005 | Restaurante El Patio | EMPRESA | DEMO-RUC-005 | REGULAR | +505 0000 0005 | compras05@example.com | Activo |
| DEMO-CLI-006 | Oficina Alameda | EMPRESA | DEMO-RUC-006 | REGULAR | +505 0000 0006 | compras06@example.com | Activo |
| DEMO-CLI-007 | Clínica Buen Día | EMPRESA | DEMO-RUC-007 | REGULAR | +505 0000 0007 | compras07@example.com | Activo |
| DEMO-CLI-008 | Hotel Los Robles | EMPRESA | DEMO-RUC-008 | REGULAR | +505 0000 0008 | compras08@example.com | Activo |
| DEMO-CLI-009 | Librería Central | EMPRESA | DEMO-RUC-009 | REGULAR | +505 0000 0009 | compras09@example.com | Activo |
| DEMO-CLI-010 | Comedor La Terraza | EMPRESA | DEMO-RUC-010 | REGULAR | +505 0000 0010 | compras10@example.com | Activo |
| DEMO-CLI-011 | Tienda El Parque | EMPRESA | DEMO-RUC-011 | REGULAR | +505 0000 0011 | compras11@example.com | Activo |
| DEMO-CLI-012 | Consultorio Primavera | EMPRESA | DEMO-RUC-012 | REGULAR | +505 0000 0012 | compras12@example.com | Activo |
| DEMO-CLI-013 | Cafetería La Esquina | EMPRESA | DEMO-RUC-013 | REGULAR | +505 0000 0013 | compras13@example.com | Activo |
| DEMO-CLI-014 | Oficina Mirador | EMPRESA | DEMO-RUC-014 | REGULAR | +505 0000 0014 | compras14@example.com | Activo |
| DEMO-CLI-015 | Panadería San José | EMPRESA | DEMO-RUC-015 | REGULAR | +505 0000 0015 | compras15@example.com | Activo |
| DEMO-CLI-016 | Minimarket La Fuente | EMPRESA | DEMO-RUC-016 | REGULAR | +505 0000 0016 | compras16@example.com | Activo |
| DEMO-CLI-017 | Restaurante Los Cedros | EMPRESA | DEMO-RUC-017 | REGULAR | +505 0000 0017 | compras17@example.com | Activo |
| DEMO-CLI-018 | Farmacia Las Flores | EMPRESA | DEMO-RUC-018 | REGULAR | +505 0000 0018 | compras18@example.com | Activo |
| DEMO-CLI-019 | Hotel Jardines | EMPRESA | DEMO-RUC-019 | REGULAR | +505 0000 0019 | compras19@example.com | Activo |
| DEMO-CLI-020 | María Solís | NATURAL | DEMO-ID-020 | REGULAR | +505 0000 0020 | compras20@example.com | Activo |

Los teléfonos/identificaciones son deliberadamente de demostración, no datos de contacto utilizables. Si se importan a un entorno real, usar la validación y catálogos reales del sistema.

| Contacto | Cliente | Nombre ficticio | Cargo | Principal | Ubicación |
| --- | --- | --- | --- | --- | --- |
| DEMO-CTO-001 | DEMO-CLI-001 | Andrea López | Compras / administración | Sí | DEMO-UBI-001 |
| DEMO-CTO-002 | DEMO-CLI-002 | Carlos Ruiz | Compras / administración | Sí | DEMO-UBI-002 |
| DEMO-CTO-003 | DEMO-CLI-003 | Lucía Pérez | Compras / administración | Sí | DEMO-UBI-003 |
| DEMO-CTO-004 | DEMO-CLI-004 | Daniel Castro | Compras / administración | Sí | DEMO-UBI-004 |
| DEMO-CTO-005 | DEMO-CLI-005 | Sofía Martínez | Compras / administración | Sí | DEMO-UBI-005 |
| DEMO-CTO-006 | DEMO-CLI-006 | Andrea López | Compras / administración | Sí | DEMO-UBI-006 |
| DEMO-CTO-007 | DEMO-CLI-007 | Carlos Ruiz | Compras / administración | Sí | DEMO-UBI-007 |
| DEMO-CTO-008 | DEMO-CLI-008 | Lucía Pérez | Compras / administración | Sí | DEMO-UBI-008 |
| DEMO-CTO-009 | DEMO-CLI-009 | Daniel Castro | Compras / administración | Sí | DEMO-UBI-009 |
| DEMO-CTO-010 | DEMO-CLI-010 | Sofía Martínez | Compras / administración | Sí | DEMO-UBI-010 |
| DEMO-CTO-011 | DEMO-CLI-011 | Andrea López | Compras / administración | Sí | DEMO-UBI-011 |
| DEMO-CTO-012 | DEMO-CLI-012 | Carlos Ruiz | Compras / administración | Sí | DEMO-UBI-012 |
| DEMO-CTO-013 | DEMO-CLI-013 | Lucía Pérez | Compras / administración | Sí | DEMO-UBI-013 |
| DEMO-CTO-014 | DEMO-CLI-014 | Daniel Castro | Compras / administración | Sí | DEMO-UBI-014 |
| DEMO-CTO-015 | DEMO-CLI-015 | Sofía Martínez | Compras / administración | Sí | DEMO-UBI-015 |
| DEMO-CTO-016 | DEMO-CLI-016 | Andrea López | Compras / administración | Sí | DEMO-UBI-016 |
| DEMO-CTO-017 | DEMO-CLI-017 | Carlos Ruiz | Compras / administración | Sí | DEMO-UBI-017 |
| DEMO-CTO-018 | DEMO-CLI-018 | Lucía Pérez | Compras / administración | Sí | DEMO-UBI-018 |
| DEMO-CTO-019 | DEMO-CLI-019 | Daniel Castro | Compras / administración | Sí | DEMO-UBI-019 |
| DEMO-CTO-020 | DEMO-CLI-020 | Sofía Martínez | Compras / administración | Sí | DEMO-UBI-020 |

| Ubicación | Cliente | Nombre | Dirección ficticia | Tipo | Estado |
| --- | --- | --- | --- | --- | --- |
| DEMO-UBI-001 | DEMO-CLI-001 | Local principal | Managua · Sector de demostración 1 · Local 01 | Sede | Activa |
| DEMO-UBI-002 | DEMO-CLI-002 | Local principal | Managua · Sector de demostración 2 · Local 02 | Sede | Activa |
| DEMO-UBI-003 | DEMO-CLI-003 | Local principal | Managua · Sector de demostración 3 · Local 03 | Sede | Activa |
| DEMO-UBI-004 | DEMO-CLI-004 | Local principal | Managua · Sector de demostración 4 · Local 04 | Sede | Activa |
| DEMO-UBI-005 | DEMO-CLI-005 | Local principal | Managua · Sector de demostración 5 · Local 05 | Sede | Activa |
| DEMO-UBI-006 | DEMO-CLI-006 | Local principal | Managua · Sector de demostración 1 · Local 06 | Sede | Activa |
| DEMO-UBI-007 | DEMO-CLI-007 | Local principal | Managua · Sector de demostración 2 · Local 07 | Sede | Activa |
| DEMO-UBI-008 | DEMO-CLI-008 | Local principal | Managua · Sector de demostración 3 · Local 08 | Sede | Activa |
| DEMO-UBI-009 | DEMO-CLI-009 | Local principal | Managua · Sector de demostración 4 · Local 09 | Sede | Activa |
| DEMO-UBI-010 | DEMO-CLI-010 | Local principal | Managua · Sector de demostración 5 · Local 10 | Sede | Activa |
| DEMO-UBI-011 | DEMO-CLI-011 | Local principal | Managua · Sector de demostración 1 · Local 11 | Sede | Activa |
| DEMO-UBI-012 | DEMO-CLI-012 | Local principal | Managua · Sector de demostración 2 · Local 12 | Sede | Activa |
| DEMO-UBI-013 | DEMO-CLI-013 | Local principal | Managua · Sector de demostración 3 · Local 13 | Sede | Activa |
| DEMO-UBI-014 | DEMO-CLI-014 | Local principal | Managua · Sector de demostración 4 · Local 14 | Sede | Activa |
| DEMO-UBI-015 | DEMO-CLI-015 | Local principal | Managua · Sector de demostración 5 · Local 15 | Sede | Activa |
| DEMO-UBI-016 | DEMO-CLI-016 | Local principal | Managua · Sector de demostración 1 · Local 16 | Sede | Activa |
| DEMO-UBI-017 | DEMO-CLI-017 | Local principal | Managua · Sector de demostración 2 · Local 17 | Sede | Activa |
| DEMO-UBI-018 | DEMO-CLI-018 | Local principal | Managua · Sector de demostración 3 · Local 18 | Sede | Activa |
| DEMO-UBI-019 | DEMO-CLI-019 | Local principal | Managua · Sector de demostración 4 · Local 19 | Sede | Activa |
| DEMO-UBI-020 | DEMO-CLI-020 | Local principal | Managua · Sector de demostración 5 · Local 20 | Sede | Activa |

| Cliente | Información fiscal | Documento HTTPS de ejemplo | Nota comercial |
| --- | --- | --- | --- |
| DEMO-CLI-001 | Café Las Brisas · DEMO-RUC-001 · NIO | https://example.com/trackon/cliente-001.pdf | Coordinar atención en horario de oficina |
| DEMO-CLI-002 | Panadería El Molino · DEMO-RUC-002 · NIO | https://example.com/trackon/cliente-002.pdf | Coordinar atención en horario de oficina |
| DEMO-CLI-003 | Minimarket Los Pinos · DEMO-RUC-003 · NIO | https://example.com/trackon/cliente-003.pdf | Coordinar atención en horario de oficina |
| DEMO-CLI-004 | Farmacia La Plaza · DEMO-RUC-004 · NIO | https://example.com/trackon/cliente-004.pdf | Coordinar atención en horario de oficina |
| DEMO-CLI-005 | Restaurante El Patio · DEMO-RUC-005 · NIO | https://example.com/trackon/cliente-005.pdf | Coordinar atención en horario de oficina |
| DEMO-CLI-006 | Oficina Alameda · DEMO-RUC-006 · NIO | https://example.com/trackon/cliente-006.pdf | Coordinar atención en horario de oficina |
| DEMO-CLI-007 | Clínica Buen Día · DEMO-RUC-007 · NIO | https://example.com/trackon/cliente-007.pdf | Coordinar atención en horario de oficina |
| DEMO-CLI-008 | Hotel Los Robles · DEMO-RUC-008 · NIO | https://example.com/trackon/cliente-008.pdf | Coordinar atención en horario de oficina |
| DEMO-CLI-009 | Librería Central · DEMO-RUC-009 · NIO | https://example.com/trackon/cliente-009.pdf | Coordinar atención en horario de oficina |
| DEMO-CLI-010 | Comedor La Terraza · DEMO-RUC-010 · NIO | https://example.com/trackon/cliente-010.pdf | Coordinar atención en horario de oficina |
| DEMO-CLI-011 | Tienda El Parque · DEMO-RUC-011 · NIO | https://example.com/trackon/cliente-011.pdf | Coordinar atención en horario de oficina |
| DEMO-CLI-012 | Consultorio Primavera · DEMO-RUC-012 · NIO | https://example.com/trackon/cliente-012.pdf | Coordinar atención en horario de oficina |
| DEMO-CLI-013 | Cafetería La Esquina · DEMO-RUC-013 · NIO | https://example.com/trackon/cliente-013.pdf | Coordinar atención en horario de oficina |
| DEMO-CLI-014 | Oficina Mirador · DEMO-RUC-014 · NIO | https://example.com/trackon/cliente-014.pdf | Coordinar atención en horario de oficina |
| DEMO-CLI-015 | Panadería San José · DEMO-RUC-015 · NIO | https://example.com/trackon/cliente-015.pdf | Coordinar atención en horario de oficina |
| DEMO-CLI-016 | Minimarket La Fuente · DEMO-RUC-016 · NIO | https://example.com/trackon/cliente-016.pdf | Coordinar atención en horario de oficina |
| DEMO-CLI-017 | Restaurante Los Cedros · DEMO-RUC-017 · NIO | https://example.com/trackon/cliente-017.pdf | Coordinar atención en horario de oficina |
| DEMO-CLI-018 | Farmacia Las Flores · DEMO-RUC-018 · NIO | https://example.com/trackon/cliente-018.pdf | Coordinar atención en horario de oficina |
| DEMO-CLI-019 | Hotel Jardines · DEMO-RUC-019 · NIO | https://example.com/trackon/cliente-019.pdf | Coordinar atención en horario de oficina |
| DEMO-CLI-020 | María Solís · DEMO-ID-020 · NIO | https://example.com/trackon/cliente-020.pdf | Coordinar atención en horario de oficina |

### Formulario y detalle de cliente

| Sección | Campos / contenido |
| --- | --- |
| General | Tipo persona; nombre/razón social; código; identificación; teléfono; correo; estado |
| Contactos | Nombre, cargo, teléfono, correo, principal; agregar/editar/desactivar según permisos |
| Ubicaciones | Nombre, dirección, referencia y contacto; sede/sucursal/área en la propuesta visual |
| Fiscal | Razón social, identificación fiscal e instrucciones de facturación; sin tasas legales fijas |
| Clasificación | REGULAR como etiqueta de ejemplo; utilizar los valores válidos del entorno |
| Documentos | Nombre, tipo, URL HTTPS y observación; no presentar los enlaces example.com como descargas reales |
| Detalle por pestañas | Resumen · Contactos · Ubicaciones · Fiscal · Documentos · Equipos · Cotizaciones · Ventas · Órdenes · Contratos · Facturas · Historial |
| Acciones ⋯ | Ver detalle · Editar · Agregar contacto · Agregar documento · Agregar nota. Conservación de historial |

| Evento | Fecha | Actor | Cliente | Actividad |
| --- | --- | --- | --- | --- |
| DEMO-HIS-001 | 2026-09-30 10:00 | Andrea López | DEMO-CLI-001 | Cliente registrado, contacto principal y sede documentados |
| DEMO-HIS-002 | 2026-09-30 11:00 | Andrea López | DEMO-CLI-002 | Cliente registrado, contacto principal y sede documentados |
| DEMO-HIS-003 | 2026-09-30 12:00 | Andrea López | DEMO-CLI-003 | Cliente registrado, contacto principal y sede documentados |
| DEMO-HIS-004 | 2026-09-30 13:00 | Andrea López | DEMO-CLI-004 | Cliente registrado, contacto principal y sede documentados |
| DEMO-HIS-005 | 2026-09-30 09:00 | Andrea López | DEMO-CLI-005 | Cliente registrado, contacto principal y sede documentados |
| DEMO-HIS-006 | 2026-09-30 10:00 | Andrea López | DEMO-CLI-006 | Cliente registrado, contacto principal y sede documentados |
| DEMO-HIS-007 | 2026-09-30 11:00 | Andrea López | DEMO-CLI-007 | Cliente registrado, contacto principal y sede documentados |
| DEMO-HIS-008 | 2026-09-30 12:00 | Andrea López | DEMO-CLI-008 | Cliente registrado, contacto principal y sede documentados |
| DEMO-HIS-009 | 2026-09-30 13:00 | Andrea López | DEMO-CLI-009 | Cliente registrado, contacto principal y sede documentados |
| DEMO-HIS-010 | 2026-09-30 09:00 | Andrea López | DEMO-CLI-010 | Cliente registrado, contacto principal y sede documentados |
| DEMO-HIS-011 | 2026-09-30 10:00 | Andrea López | DEMO-CLI-011 | Cliente registrado, contacto principal y sede documentados |
| DEMO-HIS-012 | 2026-09-30 11:00 | Andrea López | DEMO-CLI-012 | Cliente registrado, contacto principal y sede documentados |
| DEMO-HIS-013 | 2026-09-30 12:00 | Andrea López | DEMO-CLI-013 | Cliente registrado, contacto principal y sede documentados |
| DEMO-HIS-014 | 2026-09-30 13:00 | Andrea López | DEMO-CLI-014 | Cliente registrado, contacto principal y sede documentados |
| DEMO-HIS-015 | 2026-09-30 09:00 | Andrea López | DEMO-CLI-015 | Cliente registrado, contacto principal y sede documentados |
| DEMO-HIS-016 | 2026-09-30 10:00 | Andrea López | DEMO-CLI-016 | Cliente registrado, contacto principal y sede documentados |
| DEMO-HIS-017 | 2026-09-30 11:00 | Andrea López | DEMO-CLI-017 | Cliente registrado, contacto principal y sede documentados |
| DEMO-HIS-018 | 2026-09-30 12:00 | Andrea López | DEMO-CLI-018 | Cliente registrado, contacto principal y sede documentados |
| DEMO-HIS-019 | 2026-09-30 13:00 | Andrea López | DEMO-CLI-019 | Cliente registrado, contacto principal y sede documentados |
| DEMO-HIS-020 | 2026-09-30 09:00 | Andrea López | DEMO-CLI-020 | Cliente registrado, contacto principal y sede documentados |

### Historial integral del cliente001, listo para el detalle

Ordenar descendente en la UI; todas las fechas siguientes son de2026, America/Managua. Las altas de los veinte clientes son del30septiembre, antes de sus cotizaciones y contratos.

| Fecha | Actividad | Referencia de demostración |
| --- | --- | --- |
| 30 sep 10:00 | Cliente creado | DEMO-CLI-001 |
| 01 oct 08:00 | Contrato y garantía registrados | DEMO-CON-001 /GAR-001 |
| 01 oct 09:00 | Cotización creada | DEMO-COT-001 |
| 01 oct 14:00 | Cotización enviada | DEMO-COT-001 |
| 04 oct 14:00 | Segunda cotización enviada; pendiente de decisión | DEMO-COT-016 |
| 05 oct 10:00 | Seguimiento comercial registrado | DEMO-SEG-001 |
| 05 oct 11:00 | Cotización aprobada por administradora | DEMO-COT-001 |
| 06 oct 09:00 | Venta confirmada | DEMO-VTA-001 |
| 06 oct 15:00 | Servicio realizado registrado | DEMO-FAC-001 |
| 07 oct 09:00 | Comprobante registrado | DEMO-DOC-001 |
| 07 oct 10:00 | Servicio aplicado al comprobante | DEMO-FAC-001 /DOC-001 |
| 07 oct 12:00 | Costo de mano de obra registrado | DEMO-COS-001 |
| 08 oct 12:00 | Cobro completo aplicado | DEMO-COB-001 |
| 10 oct 08:00 | Reclamo abierto | DEMO-CAS-001 |
| 10 oct 10:00 | Respuesta registrada | DEMO-CAS-001 |
| 10 oct 11:00 | Correctiva creada | DEMO-COR-001 |
| 11 oct 09:00 | Retrabajo registrado | DEMO-RET-001 |
| 11 oct 15:00 | Caso resuelto: procede | DEMO-CAS-001 |
| 11 oct 16:00 | Correctiva cerrada | DEMO-COR-001 |
| 12 oct 10:00 | Caso cerrado | DEMO-CAS-001 |
| 14 oct 08:00 | Reincidencia abierta | DEMO-CAS-002 |
| 14 oct 13:00 | Respuesta fuera del plazo | DEMO-CAS-002 |
| 15 oct 09:00 | Retrabajo registrado | DEMO-RET-002 |
| 15 oct 15:00 | Reincidencia resuelta | DEMO-CAS-002 |
| 16 oct 10:00 | Reincidencia cerrada | DEMO-CAS-002 |

## 3. A.3 — Catálogo comercial y tarifarios

| Código | Descripción | Tipo | Unidad | Costo NIO | Precio de venta NIO | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| DEMO-CAT-001 | Limpieza de unidad interior | SERVICIO | servicio | 924.00 | 1320.00 | Activo |
| DEMO-CAT-002 | Revisión técnica de climatización | SERVICIO | servicio | 952.00 | 1360.00 | Activo |
| DEMO-CAT-003 | Mantenimiento preventivo básico | SERVICIO | servicio | 980.00 | 1400.00 | Activo |
| DEMO-CAT-004 | Limpieza de condensador | SERVICIO | servicio | 1008.00 | 1440.00 | Activo |
| DEMO-CAT-005 | Mantenimiento de refrigeración comercial | SERVICIO | servicio | 1036.00 | 1480.00 | Activo |
| DEMO-CAT-006 | Técnico general | MANO_OBRA | hora | 210.00 | 300.00 | Activo |
| DEMO-CAT-007 | Técnico de refrigeración | MANO_OBRA | hora | 224.00 | 320.00 | Activo |
| DEMO-CAT-008 | Técnico eléctrico | MANO_OBRA | hora | 238.00 | 340.00 | Activo |
| DEMO-CAT-009 | Ayudante técnico | MANO_OBRA | hora | 252.00 | 360.00 | Activo |
| DEMO-CAT-010 | Aire acondicionado estándar | EQUIPO | unidad | 13500.00 | 18000.00 | Activo |
| DEMO-CAT-011 | Unidad de refrigeración compacta | EQUIPO | unidad | 13950.00 | 18600.00 | Activo |
| DEMO-CAT-012 | Equipo de climatización comercial | EQUIPO | unidad | 14400.00 | 19200.00 | Activo |
| DEMO-CAT-013 | Capacitor de servicio | REPUESTO | unidad | 360.00 | 480.00 | Activo |
| DEMO-CAT-014 | Sensor de temperatura | REPUESTO | unidad | 375.00 | 500.00 | Activo |
| DEMO-CAT-015 | Válvula de servicio | REPUESTO | unidad | 390.00 | 520.00 | Activo |
| DEMO-CAT-016 | Contactor estándar | REPUESTO | unidad | 405.00 | 540.00 | Activo |
| DEMO-CAT-017 | Limpiador técnico | INSUMO | unidad | 75.00 | 100.00 | Activo |
| DEMO-CAT-018 | Cinta aislante | INSUMO | unidad | 78.75 | 105.00 | Activo |
| DEMO-CAT-019 | Conector de servicio | INSUMO | unidad | 82.50 | 110.00 | Activo |
| DEMO-CAT-020 | Protector de cable | INSUMO | unidad | 86.25 | 115.00 | Activo |

Tarifas estándar: una por cada concepto, con precio de venta de su fila, vigencia desde el 1 de octubre y estado activo. Costos y precios son columnas distintas; el margen se calcula sin mezclar ambos importes.

| Tarifa especial | Ámbito | Concepto | Precio NIO | Vigencia |
| --- | --- | --- | --- | --- |
| DEMO-TAR-021 | Cliente DEMO-CLI-016 | DEMO-CAT-003 | 1380.00 | 01 oct → 31 dic |
| DEMO-TAR-022 | Cliente DEMO-CLI-017 | DEMO-CAT-004 | 1420.00 | 01 oct → 31 dic |
| DEMO-TAR-023 | Cliente DEMO-CLI-018 | DEMO-CAT-005 | 1460.00 | 01 oct → 31 dic |

Formulario: código, nombre, tipo, unidad, costo, precio y estado. Vista de tarifarios: ámbito estándar/cliente, cliente cuando corresponda y vigencia. La tarifa por contrato y la autorización avanzada de descuentos son flujos visuales del alcance original que requieren ampliación sobre el MVP actual; no afirmar que ya tienen endpoint.

## 4. A.2 — Cotizaciones y ventas

Veinte cotizaciones: creadas entre el 1 y el 4 de octubre a las 09:00, enviadas ese mismo día a las 14:00 salvo el borrador. Aprobaciones/rechazo: 5 de octubre a las 11:00. Cantidad1.000, precio del concepto, descuento0 e impuestos0 en esta muestra; esto no establece una regla tributaria.

| Cotización | Cliente | Concepto | Cantidad | Subtotal = total NIO | Estado efectivo | Vence |
| --- | --- | --- | --- | --- | --- | --- |
| DEMO-COT-001 | DEMO-CLI-001 | DEMO-CAT-001 | 1.000 | 1320.00 | APROBADA | 31 oct |
| DEMO-COT-002 | DEMO-CLI-002 | DEMO-CAT-002 | 1.000 | 1360.00 | APROBADA | 31 oct |
| DEMO-COT-003 | DEMO-CLI-003 | DEMO-CAT-003 | 1.000 | 1400.00 | APROBADA | 31 oct |
| DEMO-COT-004 | DEMO-CLI-004 | DEMO-CAT-004 | 1.000 | 1440.00 | APROBADA | 31 oct |
| DEMO-COT-005 | DEMO-CLI-005 | DEMO-CAT-005 | 1.000 | 1480.00 | APROBADA | 31 oct |
| DEMO-COT-006 | DEMO-CLI-006 | DEMO-CAT-001 | 1.000 | 1320.00 | APROBADA | 31 oct |
| DEMO-COT-007 | DEMO-CLI-007 | DEMO-CAT-002 | 1.000 | 1360.00 | APROBADA | 31 oct |
| DEMO-COT-008 | DEMO-CLI-008 | DEMO-CAT-003 | 1.000 | 1400.00 | APROBADA | 31 oct |
| DEMO-COT-009 | DEMO-CLI-009 | DEMO-CAT-004 | 1.000 | 1440.00 | APROBADA | 31 oct |
| DEMO-COT-010 | DEMO-CLI-010 | DEMO-CAT-005 | 1.000 | 1480.00 | APROBADA | 31 oct |
| DEMO-COT-011 | DEMO-CLI-011 | DEMO-CAT-001 | 1.000 | 1320.00 | APROBADA | 31 oct |
| DEMO-COT-012 | DEMO-CLI-012 | DEMO-CAT-002 | 1.000 | 1360.00 | APROBADA | 31 oct |
| DEMO-COT-013 | DEMO-CLI-013 | DEMO-CAT-003 | 1.000 | 1400.00 | APROBADA | 31 oct |
| DEMO-COT-014 | DEMO-CLI-014 | DEMO-CAT-004 | 1.000 | 1440.00 | APROBADA | 31 oct |
| DEMO-COT-015 | DEMO-CLI-015 | DEMO-CAT-005 | 1.000 | 1480.00 | APROBADA | 31 oct |
| DEMO-COT-016 | DEMO-CLI-001 | DEMO-CAT-001 | 1.000 | 1320.00 | ENVIADA | 31 oct |
| DEMO-COT-017 | DEMO-CLI-002 | DEMO-CAT-002 | 1.000 | 1360.00 | ENVIADA | 31 oct |
| DEMO-COT-018 | DEMO-CLI-018 | DEMO-CAT-003 | 1.000 | 1400.00 | BORRADOR | 31 oct |
| DEMO-COT-019 | DEMO-CLI-019 | DEMO-CAT-004 | 1.000 | 1440.00 | RECHAZADA | 31 oct |
| DEMO-COT-020 | DEMO-CLI-020 | DEMO-CAT-005 | 1.000 | 1480.00 | VENCIDA | 18 oct |

DEMO-COT-020 está almacenada como enviada sin decisión y se muestra vencida al corte. Las cotizaciones016/017 pertenecen a los clientes001/002 para que su portal permita consultar una operación anterior y decidir una pendiente sin mezclar clientes.

| Venta | Cotización de origen | Cliente | Confirmada | Importe NIO |
| --- | --- | --- | --- | --- |
| DEMO-VTA-001 | DEMO-COT-001 | DEMO-CLI-001 | 2026-10-06 09:00 | 1320.00 |
| DEMO-VTA-002 | DEMO-COT-002 | DEMO-CLI-002 | 2026-10-07 09:00 | 1360.00 |
| DEMO-VTA-003 | DEMO-COT-003 | DEMO-CLI-003 | 2026-10-08 09:00 | 1400.00 |
| DEMO-VTA-004 | DEMO-COT-004 | DEMO-CLI-004 | 2026-10-09 09:00 | 1440.00 |
| DEMO-VTA-005 | DEMO-COT-005 | DEMO-CLI-005 | 2026-10-10 09:00 | 1480.00 |
| DEMO-VTA-006 | DEMO-COT-006 | DEMO-CLI-006 | 2026-10-11 09:00 | 1320.00 |
| DEMO-VTA-007 | DEMO-COT-007 | DEMO-CLI-007 | 2026-10-12 09:00 | 1360.00 |
| DEMO-VTA-008 | DEMO-COT-008 | DEMO-CLI-008 | 2026-10-13 09:00 | 1400.00 |
| DEMO-VTA-009 | DEMO-COT-009 | DEMO-CLI-009 | 2026-10-14 09:00 | 1440.00 |
| DEMO-VTA-010 | DEMO-COT-010 | DEMO-CLI-010 | 2026-10-15 09:00 | 1480.00 |
| DEMO-VTA-011 | DEMO-COT-011 | DEMO-CLI-011 | 2026-10-16 09:00 | 1320.00 |
| DEMO-VTA-012 | DEMO-COT-012 | DEMO-CLI-012 | 2026-10-17 09:00 | 1360.00 |
| DEMO-VTA-013 | DEMO-COT-013 | DEMO-CLI-013 | 2026-10-18 09:00 | 1400.00 |
| DEMO-VTA-014 | DEMO-COT-014 | DEMO-CLI-014 | 2026-10-19 09:00 | 1440.00 |
| DEMO-VTA-015 | DEMO-COT-015 | DEMO-CLI-015 | 2026-10-20 09:00 | 1480.00 |

| Seguimiento | Cotización | Fecha | Nota |
| --- | --- | --- | --- |
| DEMO-SEG-001 | DEMO-COT-001 | 2026-10-05 10:00 | Condiciones y disponibilidad comunicadas al cliente |
| DEMO-SEG-002 | DEMO-COT-002 | 2026-10-05 10:00 | Condiciones y disponibilidad comunicadas al cliente |
| DEMO-SEG-003 | DEMO-COT-003 | 2026-10-05 10:00 | Condiciones y disponibilidad comunicadas al cliente |
| DEMO-SEG-004 | DEMO-COT-004 | 2026-10-05 10:00 | Condiciones y disponibilidad comunicadas al cliente |
| DEMO-SEG-005 | DEMO-COT-005 | 2026-10-05 10:00 | Condiciones y disponibilidad comunicadas al cliente |
| DEMO-SEG-006 | DEMO-COT-006 | 2026-10-05 10:00 | Condiciones y disponibilidad comunicadas al cliente |
| DEMO-SEG-007 | DEMO-COT-007 | 2026-10-05 10:00 | Condiciones y disponibilidad comunicadas al cliente |
| DEMO-SEG-008 | DEMO-COT-008 | 2026-10-05 10:00 | Condiciones y disponibilidad comunicadas al cliente |
| DEMO-SEG-009 | DEMO-COT-009 | 2026-10-05 10:00 | Condiciones y disponibilidad comunicadas al cliente |
| DEMO-SEG-010 | DEMO-COT-010 | 2026-10-05 10:00 | Condiciones y disponibilidad comunicadas al cliente |
| DEMO-SEG-011 | DEMO-COT-011 | 2026-10-05 10:00 | Condiciones y disponibilidad comunicadas al cliente |
| DEMO-SEG-012 | DEMO-COT-012 | 2026-10-05 10:00 | Condiciones y disponibilidad comunicadas al cliente |
| DEMO-SEG-013 | DEMO-COT-013 | 2026-10-05 10:00 | Condiciones y disponibilidad comunicadas al cliente |
| DEMO-SEG-014 | DEMO-COT-014 | 2026-10-05 10:00 | Condiciones y disponibilidad comunicadas al cliente |
| DEMO-SEG-015 | DEMO-COT-015 | 2026-10-05 10:00 | Condiciones y disponibilidad comunicadas al cliente |
| DEMO-SEG-016 | DEMO-COT-016 | 2026-10-05 10:00 | Condiciones y disponibilidad comunicadas al cliente |
| DEMO-SEG-017 | DEMO-COT-017 | 2026-10-05 10:00 | Condiciones y disponibilidad comunicadas al cliente |
| DEMO-SEG-018 | DEMO-COT-018 | 2026-10-05 10:00 | Condiciones y disponibilidad comunicadas al cliente |
| DEMO-SEG-019 | DEMO-COT-019 | 2026-10-05 10:00 | Condiciones y disponibilidad comunicadas al cliente |
| DEMO-SEG-020 | DEMO-COT-020 | 2026-10-05 10:00 | Condiciones y disponibilidad comunicadas al cliente |

| Estado | Acciones contextuales |
| --- | --- |
| BORRADOR | Ver · Editar · Agregar/quitar líneas · Enviar |
| ENVIADA | Ver · Aprobar · Rechazar · Registrar seguimiento |
| APROBADA sin venta | Ver · Convertir a venta una sola vez |
| APROBADA con venta | Ver cotización · Ver venta e historial |
| RECHAZADA | Ver motivo e historial |
| VENCIDA | Consultar vigencia e historial; no aprobar como si estuviera vigente |

### Formularios, aprobación y vista previa

| Flujo | Contenido completo para dibujar |
| --- | --- |
| Nueva/editar cotización | Cliente, vigencia, líneas buscables, concepto, tipo, unidad, cantidad, precio, descuento, impuesto, subtotal, total y condiciones. Valores monetarios con dos decimales |
| Servicio de ejemplo | DEMO-CAT-003 ×1.000 = C$1400.00 |
| Producto de ejemplo | Plantilla independiente: DEMO-CAT-010 ×1.000 = C$18000.00 |
| Mixta de ejemplo | Plantilla independiente: DEMO-CAT-003 + DEMO-CAT-013 = C$1880.00 |
| Vista previa | MULTICAS · referencia · fecha · cliente · identificación · líneas · totales · vigencia · condiciones |
| Aprobación | Confirmar aprobación; actor Andrea López; fecha; conservar historial |
| Rechazo | Motivo: El cliente pospone el servicio; confirmar y registrar actor |
| Conversión a venta | Resumen del cliente y cotización aprobada; botón Confirmar venta; impedir duplicado |
| Pedido visual | Tres ejemplos PED-001/002/003 vinculados a ventas001/002/003, cantidad1.000, estado Registrado. Pedidos y su aprobación independiente son referencia del alcance original, pendientes de implementación en el MVP |

Las plantillas producto/mixta no se agregan a las veinte cotizaciones ni a las ventas de los indicadores: son ejemplos de formulario sin guardar.

## 5. A.4 — Portal del cliente administrado desde ADMIN

Dentro del administrador: listado de cuentas (20 clientes), crear cuenta, activar/desactivar y restablecer contraseña. Tabla: cuenta, cliente, estado y acciones. Identificadores demo cliente001…cliente020; no incluir contraseñas reales ni simular acceso autenticado como cliente. Vista previa mediante selector de cliente y etiqueta VISTA PREVIA.

| Cliente seleccionado | Bloque del portal | Datos / acción |
| --- | --- | --- |
| DEMO-CLI-001 | Resumen | 2 cotizaciones: una aprobada y una enviada; 1 comprobante pagado; 1 contrato; 1 equipo; 1 orden cerrada |
| DEMO-CLI-001 | Mis cotizaciones | DEMO-COT-001 y DEMO-COT-016; ver; aprobar/rechazar sólo016; dejar rastro del actor real |
| DEMO-CLI-001 | Mis solicitudes | DEMO-SOL-001 aprobada; formulario de nueva solicitud: ubicación, equipo, problema, prioridad y evidencia |
| DEMO-CLI-001 | Mis órdenes / tracking | OT-2026-0001 cerrada; timeline de registro, asignación, ejecución, revisión y cierre |
| DEMO-CLI-001 | Mis equipos | DEMO-EQU-001; ficha, ubicación y garantía |
| DEMO-CLI-001 | Mis contratos | DEMO-CON-001 activo; fechas y condiciones |
| DEMO-CLI-001 | Mis facturas | DEMO-DOC-001 C$1320.00 pagada; saldo C$0.00 |
| DEMO-CLI-001 | Mis reclamos | DEMO-CAS-001 y002; consultar resolución; formulario registrar reclamo |
| DEMO-CLI-001 | Documentos | Documento técnico y referencia fiscal HTTPS de ejemplo; botón Descargar representado visualmente |

**Alcance real:** el MVP implementado del portal permite login separado, consulta y decisión de cotizaciones y administración de cuentas. Solicitudes, tracking, equipos, contratos, facturas, reclamos y descargas de portal se incluyen aquí como flujos visuales del A.4 original; todavía necesitan implementación para ser operables. La vista previa integral desde ADMIN también es una propuesta visual. Este archivo no los convierte en funcionalidades reales.

| Solicitud | Cliente | Ubicación | Equipo | Problema reportado | Prioridad | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| DEMO-SOL-001 | DEMO-CLI-001 | DEMO-UBI-001 | DEMO-EQU-001 | Revisar funcionamiento y limpieza | MEDIA | APROBADA |
| DEMO-SOL-002 | DEMO-CLI-002 | DEMO-UBI-002 | DEMO-EQU-002 | Revisar funcionamiento y limpieza | MEDIA | APROBADA |
| DEMO-SOL-003 | DEMO-CLI-003 | DEMO-UBI-003 | DEMO-EQU-003 | Revisar funcionamiento y limpieza | MEDIA | APROBADA |
| DEMO-SOL-004 | DEMO-CLI-004 | DEMO-UBI-004 | DEMO-EQU-004 | Revisar funcionamiento y limpieza | MEDIA | APROBADA |
| DEMO-SOL-005 | DEMO-CLI-005 | DEMO-UBI-005 | DEMO-EQU-005 | Revisar funcionamiento y limpieza | MEDIA | APROBADA |
| DEMO-SOL-006 | DEMO-CLI-006 | DEMO-UBI-006 | DEMO-EQU-006 | Revisar funcionamiento y limpieza | MEDIA | APROBADA |
| DEMO-SOL-007 | DEMO-CLI-007 | DEMO-UBI-007 | DEMO-EQU-007 | Revisar funcionamiento y limpieza | MEDIA | APROBADA |
| DEMO-SOL-008 | DEMO-CLI-008 | DEMO-UBI-008 | DEMO-EQU-008 | Revisar funcionamiento y limpieza | MEDIA | APROBADA |
| DEMO-SOL-009 | DEMO-CLI-009 | DEMO-UBI-009 | DEMO-EQU-009 | Revisar funcionamiento y limpieza | MEDIA | REVISADA |
| DEMO-SOL-010 | DEMO-CLI-010 | DEMO-UBI-010 | DEMO-EQU-010 | Revisar funcionamiento y limpieza | MEDIA | REVISADA |
| DEMO-SOL-011 | DEMO-CLI-011 | DEMO-UBI-011 | DEMO-EQU-011 | Revisar funcionamiento y limpieza | MEDIA | REVISADA |
| DEMO-SOL-012 | DEMO-CLI-012 | DEMO-UBI-012 | DEMO-EQU-012 | Revisar funcionamiento y limpieza | MEDIA | REVISADA |
| DEMO-SOL-013 | DEMO-CLI-013 | DEMO-UBI-013 | DEMO-EQU-013 | Revisar funcionamiento y limpieza | MEDIA | NUEVA |
| DEMO-SOL-014 | DEMO-CLI-014 | DEMO-UBI-014 | DEMO-EQU-014 | Revisar funcionamiento y limpieza | MEDIA | NUEVA |
| DEMO-SOL-015 | DEMO-CLI-015 | DEMO-UBI-015 | DEMO-EQU-015 | Revisar funcionamiento y limpieza | MEDIA | NUEVA |
| DEMO-SOL-016 | DEMO-CLI-016 | DEMO-UBI-016 | DEMO-EQU-016 | Revisar funcionamiento y limpieza | MEDIA | NUEVA |
| DEMO-SOL-017 | DEMO-CLI-017 | DEMO-UBI-017 | DEMO-EQU-017 | Revisar funcionamiento y limpieza | MEDIA | NUEVA |
| DEMO-SOL-018 | DEMO-CLI-018 | DEMO-UBI-018 | DEMO-EQU-018 | Revisar funcionamiento y limpieza | MEDIA | NUEVA |
| DEMO-SOL-019 | DEMO-CLI-019 | DEMO-UBI-019 | DEMO-EQU-019 | Revisar funcionamiento y limpieza | MEDIA | NUEVA |
| DEMO-SOL-020 | DEMO-CLI-020 | DEMO-UBI-020 | DEMO-EQU-020 | Revisar funcionamiento y limpieza | MEDIA | CANCELADA |

| Equipo | Cliente | Ubicación | Tipo | Marca / modelo ficticios | Serie ficticia | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| DEMO-EQU-001 | DEMO-CLI-001 | DEMO-UBI-001 | Climatización | Marca Demo / Serie Estándar | DEMO-SER-001 | Operativo |
| DEMO-EQU-002 | DEMO-CLI-002 | DEMO-UBI-002 | Refrigeración | Marca Demo / Serie Estándar | DEMO-SER-002 | Operativo |
| DEMO-EQU-003 | DEMO-CLI-003 | DEMO-UBI-003 | Climatización | Marca Demo / Serie Estándar | DEMO-SER-003 | Operativo |
| DEMO-EQU-004 | DEMO-CLI-004 | DEMO-UBI-004 | Refrigeración | Marca Demo / Serie Estándar | DEMO-SER-004 | Operativo |
| DEMO-EQU-005 | DEMO-CLI-005 | DEMO-UBI-005 | Climatización | Marca Demo / Serie Estándar | DEMO-SER-005 | Operativo |
| DEMO-EQU-006 | DEMO-CLI-006 | DEMO-UBI-006 | Refrigeración | Marca Demo / Serie Estándar | DEMO-SER-006 | Operativo |
| DEMO-EQU-007 | DEMO-CLI-007 | DEMO-UBI-007 | Climatización | Marca Demo / Serie Estándar | DEMO-SER-007 | Operativo |
| DEMO-EQU-008 | DEMO-CLI-008 | DEMO-UBI-008 | Refrigeración | Marca Demo / Serie Estándar | DEMO-SER-008 | Operativo |
| DEMO-EQU-009 | DEMO-CLI-009 | DEMO-UBI-009 | Climatización | Marca Demo / Serie Estándar | DEMO-SER-009 | Operativo |
| DEMO-EQU-010 | DEMO-CLI-010 | DEMO-UBI-010 | Refrigeración | Marca Demo / Serie Estándar | DEMO-SER-010 | Operativo |
| DEMO-EQU-011 | DEMO-CLI-011 | DEMO-UBI-011 | Climatización | Marca Demo / Serie Estándar | DEMO-SER-011 | Operativo |
| DEMO-EQU-012 | DEMO-CLI-012 | DEMO-UBI-012 | Refrigeración | Marca Demo / Serie Estándar | DEMO-SER-012 | Operativo |
| DEMO-EQU-013 | DEMO-CLI-013 | DEMO-UBI-013 | Climatización | Marca Demo / Serie Estándar | DEMO-SER-013 | Operativo |
| DEMO-EQU-014 | DEMO-CLI-014 | DEMO-UBI-014 | Refrigeración | Marca Demo / Serie Estándar | DEMO-SER-014 | Operativo |
| DEMO-EQU-015 | DEMO-CLI-015 | DEMO-UBI-015 | Climatización | Marca Demo / Serie Estándar | DEMO-SER-015 | Operativo |
| DEMO-EQU-016 | DEMO-CLI-016 | DEMO-UBI-016 | Refrigeración | Marca Demo / Serie Estándar | DEMO-SER-016 | Operativo |
| DEMO-EQU-017 | DEMO-CLI-017 | DEMO-UBI-017 | Climatización | Marca Demo / Serie Estándar | DEMO-SER-017 | Operativo |
| DEMO-EQU-018 | DEMO-CLI-018 | DEMO-UBI-018 | Refrigeración | Marca Demo / Serie Estándar | DEMO-SER-018 | Operativo |
| DEMO-EQU-019 | DEMO-CLI-019 | DEMO-UBI-019 | Climatización | Marca Demo / Serie Estándar | DEMO-SER-019 | Operativo |
| DEMO-EQU-020 | DEMO-CLI-020 | DEMO-UBI-020 | Refrigeración | Marca Demo / Serie Estándar | DEMO-SER-020 | Operativo |

## 6. Fuentes financieras y contratos para H.5–H.6

| Contrato | Cliente | Inicio | Fin | Importe NIO | Estado |
| --- | --- | --- | --- | --- | --- |
| DEMO-CON-001 | DEMO-CLI-001 | 2026-10-01 08:00 | 2026-12-31 18:00 | 4200.00 | Activo |
| DEMO-CON-002 | DEMO-CLI-002 | 2026-10-01 08:00 | 2026-12-31 18:00 | 4200.00 | Activo |
| DEMO-CON-003 | DEMO-CLI-003 | 2026-10-01 08:00 | 2026-12-31 18:00 | 4200.00 | Activo |

Doce comprobantes registrados, una línea de servicio cada uno. Emisión: día posterior a la venta, 09:00. Costo vinculado: día de emisión, 12:00, MANO_OBRA. Cobro: día siguiente, 12:00. Vencimiento de todos:25 octubre. Ninguno está anulado ni revertido. OT de cada línea/costo: la del cliente correspondiente en Inicio.

| Comprobante | Cliente | Venta | Importe NIO | Cobro | Pagado NIO | Saldo NIO | Costo vinculado NIO |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DEMO-DOC-001 | DEMO-CLI-001 | DEMO-VTA-001 | 1320.00 | DEMO-COB-001 | 1320.00 | 0.00 | 924.00 |
| DEMO-DOC-002 | DEMO-CLI-002 | DEMO-VTA-002 | 1360.00 | DEMO-COB-002 | 1360.00 | 0.00 | 952.00 |
| DEMO-DOC-003 | DEMO-CLI-003 | DEMO-VTA-003 | 1400.00 | DEMO-COB-003 | 1400.00 | 0.00 | 980.00 |
| DEMO-DOC-004 | DEMO-CLI-004 | DEMO-VTA-004 | 1440.00 | DEMO-COB-004 | 1440.00 | 0.00 | 1008.00 |
| DEMO-DOC-005 | DEMO-CLI-005 | DEMO-VTA-005 | 1480.00 | DEMO-COB-005 | 1480.00 | 0.00 | 1036.00 |
| DEMO-DOC-006 | DEMO-CLI-006 | DEMO-VTA-006 | 1320.00 | DEMO-COB-006 | 1320.00 | 0.00 | 924.00 |
| DEMO-DOC-007 | DEMO-CLI-007 | DEMO-VTA-007 | 1360.00 | DEMO-COB-007 | 1360.00 | 0.00 | 952.00 |
| DEMO-DOC-008 | DEMO-CLI-008 | DEMO-VTA-008 | 1400.00 | DEMO-COB-008 | 1400.00 | 0.00 | 980.00 |
| DEMO-DOC-009 | DEMO-CLI-009 | DEMO-VTA-009 | 1440.00 | DEMO-COB-009 | 1440.00 | 0.00 | 1008.00 |
| DEMO-DOC-010 | DEMO-CLI-010 | DEMO-VTA-010 | 1480.00 | DEMO-COB-010 | 740.00 | 740.00 | 1036.00 |
| DEMO-DOC-011 | DEMO-CLI-011 | DEMO-VTA-011 | 1320.00 | DEMO-COB-011 | 660.00 | 660.00 | 924.00 |
| DEMO-DOC-012 | DEMO-CLI-012 | DEMO-VTA-012 | 1360.00 | DEMO-COB-012 | 680.00 | 680.00 | 952.00 |

Servicios realizados DEMO-FAC-001…015: concepto y cantidad1.000 de su venta, fecha de esa venta a las15:00. Los primeros doce se aplican a la línea de su comprobante a las10:00 de emisión. Los últimos tres conservan pendiente1.000. El concepto/unidad se muestran separados; no sumar unidades heterogéneas.

## 7. H.5 — Indicadores comerciales, contenido completo

| Indicador | Valor | Base / fuente |
| --- | --- | --- |
| Cotizaciones | 20 | 20 registros creados en rango |
| Conversión | 78.95% | 15 aprobadas /19 enviadas |
| Ventas | 15 | Ventas confirmadas |
| Importe vendido | C$21000.00 | Suma de ventas |
| Clientes con ventas | 15 | Clientes distintos de las ventas |
| Ticket promedio | C$1400.00 | 21000 /15 |
| Contratos activos | 3 | Inicio <corte y fin >=corte |
| Renovaciones | 0 | No hay contratos sucesores |
| Tasa de renovación | Sin base | 0/0; no mostrar0% inventado |

Tarjetas destacadas: cotizaciones20, conversión78.95%, ventasC$21000.00, contratos3. Tabla completa con los nueve indicadores y fuentes. Estados de cotización: aprobadas15, enviadas2, borrador1, rechazada1, vencida1. Desgloses completos: las20 cotizaciones,15 ventas y3 contratos anteriores; mostrar referencia, fecha, tipo, cliente, total/estado y enlace al registro.

| Fecha | Ventas | Importe NIO |
| --- | --- | --- |
| 2026-10-06 | 1 | 1320.00 |
| 2026-10-07 | 1 | 1360.00 |
| 2026-10-08 | 1 | 1400.00 |
| 2026-10-09 | 1 | 1440.00 |
| 2026-10-10 | 1 | 1480.00 |
| 2026-10-11 | 1 | 1320.00 |
| 2026-10-12 | 1 | 1360.00 |
| 2026-10-13 | 1 | 1400.00 |
| 2026-10-14 | 1 | 1440.00 |
| 2026-10-15 | 1 | 1480.00 |
| 2026-10-16 | 1 | 1320.00 |
| 2026-10-17 | 1 | 1360.00 |
| 2026-10-18 | 1 | 1400.00 |
| 2026-10-19 | 1 | 1440.00 |
| 2026-10-20 | 1 | 1480.00 |

El gráfico diario es opcional para el mockup; deriva de las mismas ventas, sin crear una segunda fuente. Filtros: Desde/Hasta, tipo Cotización/Venta/Contrato, búsqueda, orden y paginación. Acciones: Consultar, abrir registro de origen y revisar cobertura.

## 8. H.6 — Indicadores financieros, contenido completo

| Indicador | Valor | Lectura |
| --- | --- | --- |
| Facturación | C$16680.00 | Importes finales registrados |
| Cobros | C$14600.00 | 9 completos y3 parciales |
| Cuentas por cobrar | C$2080.00 | Saldos al corte |
| Cuentas vencidas | C$0.00 | Todos vencen25oct |
| Costos | C$11676.00 | 70% de los comprobantes del conjunto |
| Resultado registrado | C$5004.00 | Facturación menos costos |
| Margen | 30.00% | 5004 /16680 |

Cuatro tarjetas: Facturación, Cobros, Cuentas por cobrar y Resultado. Tabla de los siete indicadores con base, unidad y fuentes. Filtros: rango, tipo de registro, agrupación Cliente/Orden y búsqueda. Mostrar los cinco desgloses siguientes, con acciones de consulta a fuentes; no añadir CxP, liquidez o presupuesto.

### Comprobantes

| Referencia | Cliente | Importe | Saldo | Estado |
| --- | --- | --- | --- | --- |
| DEMO-DOC-001 | DEMO-CLI-001 | 1320.00 | 0.00 | Pagado |
| DEMO-DOC-002 | DEMO-CLI-002 | 1360.00 | 0.00 | Pagado |
| DEMO-DOC-003 | DEMO-CLI-003 | 1400.00 | 0.00 | Pagado |
| DEMO-DOC-004 | DEMO-CLI-004 | 1440.00 | 0.00 | Pagado |
| DEMO-DOC-005 | DEMO-CLI-005 | 1480.00 | 0.00 | Pagado |
| DEMO-DOC-006 | DEMO-CLI-006 | 1320.00 | 0.00 | Pagado |
| DEMO-DOC-007 | DEMO-CLI-007 | 1360.00 | 0.00 | Pagado |
| DEMO-DOC-008 | DEMO-CLI-008 | 1400.00 | 0.00 | Pagado |
| DEMO-DOC-009 | DEMO-CLI-009 | 1440.00 | 0.00 | Pagado |
| DEMO-DOC-010 | DEMO-CLI-010 | 1480.00 | 740.00 | Parcial |
| DEMO-DOC-011 | DEMO-CLI-011 | 1320.00 | 660.00 | Parcial |
| DEMO-DOC-012 | DEMO-CLI-012 | 1360.00 | 680.00 | Parcial |

### Cobros

| Referencia | Comprobante | Importe aplicado | Fecha |
| --- | --- | --- | --- |
| DEMO-COB-001 | DEMO-DOC-001 | 1320.00 | 2026-10-08 12:00 |
| DEMO-COB-002 | DEMO-DOC-002 | 1360.00 | 2026-10-09 12:00 |
| DEMO-COB-003 | DEMO-DOC-003 | 1400.00 | 2026-10-10 12:00 |
| DEMO-COB-004 | DEMO-DOC-004 | 1440.00 | 2026-10-11 12:00 |
| DEMO-COB-005 | DEMO-DOC-005 | 1480.00 | 2026-10-12 12:00 |
| DEMO-COB-006 | DEMO-DOC-006 | 1320.00 | 2026-10-13 12:00 |
| DEMO-COB-007 | DEMO-DOC-007 | 1360.00 | 2026-10-14 12:00 |
| DEMO-COB-008 | DEMO-DOC-008 | 1400.00 | 2026-10-15 12:00 |
| DEMO-COB-009 | DEMO-DOC-009 | 1440.00 | 2026-10-16 12:00 |
| DEMO-COB-010 | DEMO-DOC-010 | 740.00 | 2026-10-17 12:00 |
| DEMO-COB-011 | DEMO-DOC-011 | 660.00 | 2026-10-18 12:00 |
| DEMO-COB-012 | DEMO-DOC-012 | 680.00 | 2026-10-19 12:00 |

### Costos

| Referencia | Cliente / comprobante | Categoría | Importe |
| --- | --- | --- | --- |
| DEMO-COS-001 | DEMO-CLI-001 /DEMO-DOC-001 | MANO_OBRA | 924.00 |
| DEMO-COS-002 | DEMO-CLI-002 /DEMO-DOC-002 | MANO_OBRA | 952.00 |
| DEMO-COS-003 | DEMO-CLI-003 /DEMO-DOC-003 | MANO_OBRA | 980.00 |
| DEMO-COS-004 | DEMO-CLI-004 /DEMO-DOC-004 | MANO_OBRA | 1008.00 |
| DEMO-COS-005 | DEMO-CLI-005 /DEMO-DOC-005 | MANO_OBRA | 1036.00 |
| DEMO-COS-006 | DEMO-CLI-006 /DEMO-DOC-006 | MANO_OBRA | 924.00 |
| DEMO-COS-007 | DEMO-CLI-007 /DEMO-DOC-007 | MANO_OBRA | 952.00 |
| DEMO-COS-008 | DEMO-CLI-008 /DEMO-DOC-008 | MANO_OBRA | 980.00 |
| DEMO-COS-009 | DEMO-CLI-009 /DEMO-DOC-009 | MANO_OBRA | 1008.00 |
| DEMO-COS-010 | DEMO-CLI-010 /DEMO-DOC-010 | MANO_OBRA | 1036.00 |
| DEMO-COS-011 | DEMO-CLI-011 /DEMO-DOC-011 | MANO_OBRA | 924.00 |
| DEMO-COS-012 | DEMO-CLI-012 /DEMO-DOC-012 | MANO_OBRA | 952.00 |

### Servicios pendientes

| Referencia | Cliente | Concepto | Cantidad | Pendiente |
| --- | --- | --- | --- | --- |
| DEMO-FAC-013 | DEMO-CLI-013 | DEMO-CAT-003 | 1.000 | 1.000 |
| DEMO-FAC-014 | DEMO-CLI-014 | DEMO-CAT-004 | 1.000 | 1.000 |
| DEMO-FAC-015 | DEMO-CLI-015 | DEMO-CAT-005 | 1.000 | 1.000 |

### Rentabilidad por cliente y por OT

| Cliente / OT | Ingresos | Costos | Resultado | Margen |
| --- | --- | --- | --- | --- |
| DEMO-CLI-001 /OT-2026-0001 | 1320.00 | 924.00 | 396.00 | 30.00% |
| DEMO-CLI-002 /OT-2026-0002 | 1360.00 | 952.00 | 408.00 | 30.00% |
| DEMO-CLI-003 /OT-2026-0003 | 1400.00 | 980.00 | 420.00 | 30.00% |
| DEMO-CLI-004 /OT-2026-0004 | 1440.00 | 1008.00 | 432.00 | 30.00% |
| DEMO-CLI-005 /OT-2026-0005 | 1480.00 | 1036.00 | 444.00 | 30.00% |
| DEMO-CLI-006 /OT-2026-0006 | 1320.00 | 924.00 | 396.00 | 30.00% |
| DEMO-CLI-007 /OT-2026-0007 | 1360.00 | 952.00 | 408.00 | 30.00% |
| DEMO-CLI-008 /OT-2026-0008 | 1400.00 | 980.00 | 420.00 | 30.00% |
| DEMO-CLI-009 /OT-2026-0009 | 1440.00 | 1008.00 | 432.00 | 30.00% |
| DEMO-CLI-010 /OT-2026-0010 | 1480.00 | 1036.00 | 444.00 | 30.00% |
| DEMO-CLI-011 /OT-2026-0011 | 1320.00 | 924.00 | 396.00 | 30.00% |
| DEMO-CLI-012 /OT-2026-0012 | 1360.00 | 952.00 | 408.00 | 30.00% |

La última tabla genera dos vistas alternativas de agrupación sobre las mismas líneas vinculadas: cliente y OT. No sumar ambas vistas entre sí porque duplicaría el mismo ingreso. Costos sin asignar:0 en este escenario.

## 9. H.7 — Indicadores logísticos, contenido completo

Veinte artículos ficticios, unidad común unidad. Aperturas30 sep08:00, consumo2.000 el10 oct08:00 y recepción2.000: artículos001–018 el16 oct09:00;019–020 el18 oct09:00. Recepción prometida17 oct:18 puntuales y2 tardías. El artículo020 abre con8.000; los demás20.000. Mínimo10.000 para todos.

| Artículo | Descripción | Unidad | Mínimo | Costo unitario NIO | Consumido | Recibido | Stock | Valor NIO | Stock medio | Rotación | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DEMO-ART-001 | Filtro estándar 01 | unidad | 10.000 | 100.000000 | 2.000 | 2.000 | 20.000 | 2000.000000000 | 19.388186 | 0.103156 | Disponible |
| DEMO-ART-002 | Capacitor estándar 02 | unidad | 10.000 | 105.000000 | 2.000 | 2.000 | 20.000 | 2100.000000000 | 19.388186 | 0.103156 | Disponible |
| DEMO-ART-003 | Sensor estándar 03 | unidad | 10.000 | 110.000000 | 2.000 | 2.000 | 20.000 | 2200.000000000 | 19.388186 | 0.103156 | Disponible |
| DEMO-ART-004 | Conector estándar 04 | unidad | 10.000 | 115.000000 | 2.000 | 2.000 | 20.000 | 2300.000000000 | 19.388186 | 0.103156 | Disponible |
| DEMO-ART-005 | Válvula estándar 05 | unidad | 10.000 | 120.000000 | 2.000 | 2.000 | 20.000 | 2400.000000000 | 19.388186 | 0.103156 | Disponible |
| DEMO-ART-006 | Filtro estándar 06 | unidad | 10.000 | 100.000000 | 2.000 | 2.000 | 20.000 | 2000.000000000 | 19.388186 | 0.103156 | Disponible |
| DEMO-ART-007 | Capacitor estándar 07 | unidad | 10.000 | 105.000000 | 2.000 | 2.000 | 20.000 | 2100.000000000 | 19.388186 | 0.103156 | Disponible |
| DEMO-ART-008 | Sensor estándar 08 | unidad | 10.000 | 110.000000 | 2.000 | 2.000 | 20.000 | 2200.000000000 | 19.388186 | 0.103156 | Disponible |
| DEMO-ART-009 | Conector estándar 09 | unidad | 10.000 | 115.000000 | 2.000 | 2.000 | 20.000 | 2300.000000000 | 19.388186 | 0.103156 | Disponible |
| DEMO-ART-010 | Válvula estándar 10 | unidad | 10.000 | 120.000000 | 2.000 | 2.000 | 20.000 | 2400.000000000 | 19.388186 | 0.103156 | Disponible |
| DEMO-ART-011 | Filtro estándar 11 | unidad | 10.000 | 100.000000 | 2.000 | 2.000 | 20.000 | 2000.000000000 | 19.388186 | 0.103156 | Disponible |
| DEMO-ART-012 | Capacitor estándar 12 | unidad | 10.000 | 105.000000 | 2.000 | 2.000 | 20.000 | 2100.000000000 | 19.388186 | 0.103156 | Disponible |
| DEMO-ART-013 | Sensor estándar 13 | unidad | 10.000 | 110.000000 | 2.000 | 2.000 | 20.000 | 2200.000000000 | 19.388186 | 0.103156 | Disponible |
| DEMO-ART-014 | Conector estándar 14 | unidad | 10.000 | 115.000000 | 2.000 | 2.000 | 20.000 | 2300.000000000 | 19.388186 | 0.103156 | Disponible |
| DEMO-ART-015 | Válvula estándar 15 | unidad | 10.000 | 120.000000 | 2.000 | 2.000 | 20.000 | 2400.000000000 | 19.388186 | 0.103156 | Disponible |
| DEMO-ART-016 | Filtro estándar 16 | unidad | 10.000 | 100.000000 | 2.000 | 2.000 | 20.000 | 2000.000000000 | 19.388186 | 0.103156 | Disponible |
| DEMO-ART-017 | Capacitor estándar 17 | unidad | 10.000 | 105.000000 | 2.000 | 2.000 | 20.000 | 2100.000000000 | 19.388186 | 0.103156 | Disponible |
| DEMO-ART-018 | Sensor estándar 18 | unidad | 10.000 | 110.000000 | 2.000 | 2.000 | 20.000 | 2200.000000000 | 19.388186 | 0.103156 | Disponible |
| DEMO-ART-019 | Conector estándar 19 | unidad | 10.000 | 115.000000 | 2.000 | 2.000 | 20.000 | 2300.000000000 | 19.185654 | 0.104245 | Disponible |
| DEMO-ART-020 | Válvula estándar 20 | unidad | 10.000 | 120.000000 | 2.000 | 2.000 | 8.000 | 960.000000000 | 7.185654 | 0.278332 | Bajo mínimo |

Compras: CMP-001 tiene20 líneas pendientes, una por artículo, cantidad4.000, creada12 oct y promesa23 oct, sin recepciones. CMP-002 tiene20 líneas de2.000, promesa17 oct, recibidas según fechas anteriores. Proveedor ficticio: Suministros Técnicos Demo. Referencias de recepción REC-001…020, una por artículo y línea de CMP-002. Abrir un detalle de recepción conserva su compra/fecha/cantidad; no incrementar stock por CMP-001.

| Recepción | Compra | Artículo | Cantidad | Fecha efectiva | Entrega |
| --- | --- | --- | --- | --- | --- |
| DEMO-REC-001 | DEMO-CMP-002 | DEMO-ART-001 | 2.000 | 2026-10-16 09:00 | Puntual |
| DEMO-REC-002 | DEMO-CMP-002 | DEMO-ART-002 | 2.000 | 2026-10-16 09:00 | Puntual |
| DEMO-REC-003 | DEMO-CMP-002 | DEMO-ART-003 | 2.000 | 2026-10-16 09:00 | Puntual |
| DEMO-REC-004 | DEMO-CMP-002 | DEMO-ART-004 | 2.000 | 2026-10-16 09:00 | Puntual |
| DEMO-REC-005 | DEMO-CMP-002 | DEMO-ART-005 | 2.000 | 2026-10-16 09:00 | Puntual |
| DEMO-REC-006 | DEMO-CMP-002 | DEMO-ART-006 | 2.000 | 2026-10-16 09:00 | Puntual |
| DEMO-REC-007 | DEMO-CMP-002 | DEMO-ART-007 | 2.000 | 2026-10-16 09:00 | Puntual |
| DEMO-REC-008 | DEMO-CMP-002 | DEMO-ART-008 | 2.000 | 2026-10-16 09:00 | Puntual |
| DEMO-REC-009 | DEMO-CMP-002 | DEMO-ART-009 | 2.000 | 2026-10-16 09:00 | Puntual |
| DEMO-REC-010 | DEMO-CMP-002 | DEMO-ART-010 | 2.000 | 2026-10-16 09:00 | Puntual |
| DEMO-REC-011 | DEMO-CMP-002 | DEMO-ART-011 | 2.000 | 2026-10-16 09:00 | Puntual |
| DEMO-REC-012 | DEMO-CMP-002 | DEMO-ART-012 | 2.000 | 2026-10-16 09:00 | Puntual |
| DEMO-REC-013 | DEMO-CMP-002 | DEMO-ART-013 | 2.000 | 2026-10-16 09:00 | Puntual |
| DEMO-REC-014 | DEMO-CMP-002 | DEMO-ART-014 | 2.000 | 2026-10-16 09:00 | Puntual |
| DEMO-REC-015 | DEMO-CMP-002 | DEMO-ART-015 | 2.000 | 2026-10-16 09:00 | Puntual |
| DEMO-REC-016 | DEMO-CMP-002 | DEMO-ART-016 | 2.000 | 2026-10-16 09:00 | Puntual |
| DEMO-REC-017 | DEMO-CMP-002 | DEMO-ART-017 | 2.000 | 2026-10-16 09:00 | Puntual |
| DEMO-REC-018 | DEMO-CMP-002 | DEMO-ART-018 | 2.000 | 2026-10-16 09:00 | Puntual |
| DEMO-REC-019 | DEMO-CMP-002 | DEMO-ART-019 | 2.000 | 2026-10-18 09:00 | Tardía1día |
| DEMO-REC-020 | DEMO-CMP-002 | DEMO-ART-020 | 2.000 | 2026-10-18 09:00 | Tardía1día |

| Herramienta | Nombre | Estado | Préstamo | Responsable ficticio | Prevista |
| --- | --- | --- | --- | --- | --- |
| DEMO-HER-001 | Manómetro 01 | Prestada | DEMO-PRE-001 | Técnico Demo 1 | 2026-10-22 17:00 |
| DEMO-HER-002 | Multímetro 02 | Prestada | DEMO-PRE-002 | Técnico Demo 2 | 2026-10-22 17:00 |
| DEMO-HER-003 | Bomba de vacío 03 | Prestada | DEMO-PRE-003 | Técnico Demo 3 | 2026-10-22 17:00 |
| DEMO-HER-004 | Pinza amperimétrica 04 | Prestada | DEMO-PRE-004 | Técnico Demo 4 | 2026-10-22 17:00 |
| DEMO-HER-005 | Manómetro 05 | Prestada | DEMO-PRE-005 | Técnico Demo 5 | 2026-10-22 17:00 |
| DEMO-HER-006 | Multímetro 06 | Prestada | DEMO-PRE-006 | Técnico Demo 1 | 2026-10-22 17:00 |
| DEMO-HER-007 | Bomba de vacío 07 | Prestada | DEMO-PRE-007 | Técnico Demo 2 | 2026-10-22 17:00 |
| DEMO-HER-008 | Pinza amperimétrica 08 | Prestada | DEMO-PRE-008 | Técnico Demo 3 | 2026-10-22 17:00 |
| DEMO-HER-009 | Manómetro 09 | Prestada | DEMO-PRE-009 | Técnico Demo 4 | 2026-10-22 17:00 |
| DEMO-HER-010 | Multímetro 10 | Prestada | DEMO-PRE-010 | Técnico Demo 5 | 2026-10-19 17:00 |
| DEMO-HER-011 | Bomba de vacío 11 | Disponible | — | — | — |
| DEMO-HER-012 | Pinza amperimétrica 12 | Disponible | — | — | — |
| DEMO-HER-013 | Manómetro 13 | Disponible | — | — | — |
| DEMO-HER-014 | Multímetro 14 | Disponible | — | — | — |
| DEMO-HER-015 | Bomba de vacío 15 | Disponible | — | — | — |
| DEMO-HER-016 | Pinza amperimétrica 16 | Disponible | — | — | — |
| DEMO-HER-017 | Manómetro 17 | Disponible | — | — | — |
| DEMO-HER-018 | Multímetro 18 | Disponible | — | — | — |
| DEMO-HER-019 | Bomba de vacío 19 | Disponible | — | — | — |
| DEMO-HER-020 | Pinza amperimétrica 20 | Disponible | — | — | — |

| Indicador | Valor |
| --- | --- |
| Artículos críticos | 1 |
| Líneas de compra pendientes | 20 |
| Herramientas prestadas | 10 |
| Herramientas vencidas | 1 |
| Inventario valorizado | C$42560.000000000 |

Cuatro tarjetas: stock crítico, compras pendientes, herramientas prestadas y valoración. Tabla completa con cinco indicadores. Desgloses: Artículo (20), Línea de compra pendiente (20), Recepción (20) y Herramienta prestada (10). Para cada artículo, consumo neto2.000. Stock medio ponderado y rotación ya están calculados a seis decimales en la tabla. Base:474 horas del rango; consumo hasta recepción145 horas para001–018 y193 horas para019–020. No sustituir la media por stock actual. Filtros: rango, tipo, artículo y búsqueda. Acciones: abrir artículo/compra/herramienta; recepción enlaza la compra real de su conjunto.

## 10. H.8 — Indicadores de calidad, contenido completo

Veinte garantías activas GAR-001…020 para clientes CLI-001…020 y activos EQU-001…020; inicio01 oct08:00 y fin31 dic18:00; cobertura “Mano de obra del servicio documentado”. Son capturas de demostración y pueden tener origen previo al período comercial. No inferir que una garantía hace procedente un reclamo.

| Caso | Cliente / activo / garantía | Falla | Abierto | Plazo respuesta | Respondido | Plazo resolución | Resuelto | Cerrado | Estado | Anterior |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DEMO-CAS-001 | DEMO-CLI-001 /DEMO-EQU-001 /DEMO-GAR-001 | LIMPIEZA | 10-10 08:00 | 10-10 12:00 | 10-10 10:00 | 10-12 17:00 | 10-11 15:00 | 10-12 10:00 | CERRADO | — |
| DEMO-CAS-002 | DEMO-CLI-001 /DEMO-EQU-001 /DEMO-GAR-001 | LIMPIEZA | 10-14 08:00 | 10-14 12:00 | 10-14 13:00 | 10-16 17:00 | 10-15 15:00 | 10-16 10:00 | CERRADO | DEMO-CAS-001 |
| DEMO-CAS-003 | DEMO-CLI-002 /DEMO-EQU-002 /DEMO-GAR-002 | AJUSTE | 10-15 08:00 | 10-15 12:00 | 10-15 10:00 | 10-17 17:00 | 10-17 18:00 | 10-18 10:00 | CERRADO | — |
| DEMO-CAS-004 | DEMO-CLI-003 /DEMO-EQU-003 /DEMO-GAR-003 | RUIDO | 10-19 08:00 | 10-19 12:00 | 10-19 10:00 | 10-22 17:00 | — | — | EN_ATENCION | — |
| DEMO-CAS-005 | DEMO-CLI-005 /DEMO-EQU-005 /DEMO-GAR-005 | REVISION | 10-20 10:00 | 10-21 12:00 | 10-20 11:00 | 10-22 17:00 | — | — | EN_ATENCION | — |
| DEMO-CAS-006 | DEMO-CLI-006 /DEMO-EQU-006 /DEMO-GAR-006 | REVISION | 10-20 10:00 | 10-21 12:00 | 10-20 11:00 | 10-22 17:00 | — | — | EN_ATENCION | — |
| DEMO-CAS-007 | DEMO-CLI-007 /DEMO-EQU-007 /DEMO-GAR-007 | REVISION | 10-20 10:00 | 10-21 12:00 | 10-20 11:00 | 10-22 17:00 | — | — | EN_ATENCION | — |
| DEMO-CAS-008 | DEMO-CLI-008 /DEMO-EQU-008 /DEMO-GAR-008 | REVISION | 10-20 10:00 | 10-21 12:00 | 10-20 11:00 | 10-22 17:00 | — | — | EN_ATENCION | — |
| DEMO-CAS-009 | DEMO-CLI-009 /DEMO-EQU-009 /DEMO-GAR-009 | REVISION | 10-20 10:00 | 10-21 12:00 | 10-20 11:00 | 10-22 17:00 | — | — | EN_ATENCION | — |
| DEMO-CAS-010 | DEMO-CLI-010 /DEMO-EQU-010 /DEMO-GAR-010 | REVISION | 10-20 10:00 | 10-21 12:00 | 10-20 11:00 | 10-22 17:00 | — | — | EN_ATENCION | — |
| DEMO-CAS-011 | DEMO-CLI-011 /DEMO-EQU-011 /DEMO-GAR-011 | REVISION | 10-20 10:00 | 10-21 12:00 | 10-20 11:00 | 10-22 17:00 | — | — | EN_ATENCION | — |
| DEMO-CAS-012 | DEMO-CLI-012 /DEMO-EQU-012 /DEMO-GAR-012 | REVISION | 10-20 10:00 | 10-21 12:00 | 10-20 11:00 | 10-22 17:00 | — | — | EN_ATENCION | — |
| DEMO-CAS-013 | DEMO-CLI-013 /DEMO-EQU-013 /DEMO-GAR-013 | REVISION | 10-20 10:00 | 10-21 12:00 | 10-20 11:00 | 10-22 17:00 | — | — | EN_ATENCION | — |
| DEMO-CAS-014 | DEMO-CLI-014 /DEMO-EQU-014 /DEMO-GAR-014 | REVISION | 10-20 10:00 | 10-21 12:00 | 10-20 11:00 | 10-22 17:00 | — | — | EN_ATENCION | — |
| DEMO-CAS-015 | DEMO-CLI-015 /DEMO-EQU-015 /DEMO-GAR-015 | REVISION | 10-20 10:00 | 10-21 12:00 | 10-20 11:00 | 10-22 17:00 | — | — | EN_ATENCION | — |
| DEMO-CAS-016 | DEMO-CLI-016 /DEMO-EQU-016 /DEMO-GAR-016 | REVISION | 10-20 10:00 | 10-21 12:00 | 10-20 11:00 | 10-22 17:00 | — | — | EN_ATENCION | — |
| DEMO-CAS-017 | DEMO-CLI-017 /DEMO-EQU-017 /DEMO-GAR-017 | REVISION | 10-20 10:00 | 10-21 12:00 | 10-20 11:00 | 10-22 17:00 | — | — | EN_ATENCION | — |
| DEMO-CAS-018 | DEMO-CLI-018 /DEMO-EQU-018 /DEMO-GAR-018 | REVISION | 10-20 10:00 | 10-21 12:00 | 10-20 11:00 | 10-22 17:00 | — | — | EN_ATENCION | — |
| DEMO-CAS-019 | DEMO-CLI-019 /DEMO-EQU-019 /DEMO-GAR-019 | REVISION | 10-20 10:00 | 10-21 12:00 | 10-20 11:00 | 10-22 17:00 | — | — | EN_ATENCION | — |
| DEMO-CAS-020 | DEMO-CLI-020 /DEMO-EQU-020 /DEMO-GAR-020 | REVISION | 10-20 10:00 | 10-21 12:00 | 10-20 11:00 | 10-22 17:00 | — | — | EN_ATENCION | — |

Todas las fechas cortas son de2026, hora deManagua. Resultado de los tres casos cerrados:PROCEDE. Descripción:“Revisión posterior al servicio”. Causa raíz:“Ajuste de procedimiento identificado en revisión”. Caso002 es reincidencia explícita del001; son el único grupo repetido de cliente+activo+falla dentro de90 días.

| Retrabajo | Caso | Fecha | Motivo |
| --- | --- | --- | --- |
| DEMO-RET-001 | DEMO-CAS-001 | 2026-10-11 09:00 | Limpieza complementaria documentada |
| DEMO-RET-002 | DEMO-CAS-002 | 2026-10-15 09:00 | Verificación complementaria documentada |

| Correctiva | Caso | Responsable ficticio | Creada | Vence | Cerrada | Resultado |
| --- | --- | --- | --- | --- | --- | --- |
| DEMO-COR-001 | DEMO-CAS-001 | Técnico Demo1 | 2026-10-10 11:00 | 2026-10-12 17:00 | 2026-10-11 16:00 | Checklist revisado |
| DEMO-COR-002 | DEMO-CAS-004 | Técnico Demo2 | 2026-10-19 11:00 | 2026-10-22 17:00 | — | Pendiente |

| Indicador | Valor | Base |
| --- | --- | --- |
| Garantías vigentes | 20 | 20 al corte |
| Reclamos abiertos | 17 | Casos004–020 aún sin cierre |
| Reincidencias | 1 | Caso002 con antecedente001 |
| Retrabajos | 2 | Dos eventos en rango |
| Grupos de fallas repetidas | 1 | Cliente001 + equipo001 + LIMPIEZA |
| SLA respuesta | 75.00% | 3 de4 plazos evaluables; plazos futuros excluidos |
| SLA resolución | 66.67% | 2 de3 plazos evaluables; tercero atendido1hora tarde |
| Correctivas abiertas | 1 | COR-002 |
| Correctivas vencidas | 0 | La abierta vence22oct |

Cuatro tarjetas: garantías, casos abiertos, reincidencias y retrabajos. Tabla con nueve métricas. Desgloses: Garantía(20), Caso(20), Retrabajo(2), Correctiva(2), Grupo repetido(1), con enlaces a sus referencias. Mostrar estado al corte y cumplimiento independiente de respuesta/resolución. Casos con plazos incompletos:0. Filtros: rango, tipo, activo, código de falla y búsqueda. No incluir RRHH/nómina.

## 11. Notificaciones, actividades y cobertura — contenido común

| Notificación | Fecha | Mensaje | Referencia | Estado |
| --- | --- | --- | --- | --- |
| DEMO-NOT-001 | 2026-10-20 09:00 | Revisar seguimiento de cotización | DEMO-CLI-001 | Sin leer |
| DEMO-NOT-002 | 2026-10-20 10:00 | Atención programada para el cliente | DEMO-CLI-002 | Sin leer |
| DEMO-NOT-003 | 2026-10-20 11:00 | Documento del cliente actualizado | DEMO-CLI-003 | Sin leer |
| DEMO-NOT-004 | 2026-10-20 12:00 | Consultar revisión de servicio | DEMO-CLI-004 | Sin leer |
| DEMO-NOT-005 | 2026-10-20 13:00 | Recordatorio de actividad registrada | DEMO-CLI-005 | Sin leer |
| DEMO-NOT-006 | 2026-10-20 14:00 | Revisar seguimiento de cotización | DEMO-CLI-006 | Sin leer |
| DEMO-NOT-007 | 2026-10-20 15:00 | Atención programada para el cliente | DEMO-CLI-007 | Sin leer |
| DEMO-NOT-008 | 2026-10-20 08:00 | Documento del cliente actualizado | DEMO-CLI-008 | Sin leer |
| DEMO-NOT-009 | 2026-10-20 09:00 | Consultar revisión de servicio | DEMO-CLI-009 | Sin leer |
| DEMO-NOT-010 | 2026-10-20 10:00 | Recordatorio de actividad registrada | DEMO-CLI-010 | Sin leer |
| DEMO-NOT-011 | 2026-10-20 11:00 | Revisar seguimiento de cotización | DEMO-CLI-011 | Sin leer |
| DEMO-NOT-012 | 2026-10-20 12:00 | Atención programada para el cliente | DEMO-CLI-012 | Sin leer |
| DEMO-NOT-013 | 2026-10-20 13:00 | Documento del cliente actualizado | DEMO-CLI-013 | Leída |
| DEMO-NOT-014 | 2026-10-20 14:00 | Consultar revisión de servicio | DEMO-CLI-014 | Leída |
| DEMO-NOT-015 | 2026-10-20 15:00 | Recordatorio de actividad registrada | DEMO-CLI-015 | Leída |
| DEMO-NOT-016 | 2026-10-20 08:00 | Revisar seguimiento de cotización | DEMO-CLI-016 | Leída |
| DEMO-NOT-017 | 2026-10-20 09:00 | Atención programada para el cliente | DEMO-CLI-017 | Leída |
| DEMO-NOT-018 | 2026-10-20 10:00 | Documento del cliente actualizado | DEMO-CLI-018 | Leída |
| DEMO-NOT-019 | 2026-10-20 11:00 | Consultar revisión de servicio | DEMO-CLI-019 | Leída |
| DEMO-NOT-020 | 2026-10-20 12:00 | Recordatorio de actividad registrada | DEMO-CLI-020 | Leída |

Campana:12 sinleer; acciones Ver todas y marcar como leída. Al marcar una, decrementar el contador del mockup. No mostrar notificaciones de clientes distintos en la vista previa de un cliente.

| Área | Cobertura de demostración | Desde | Hasta verificada | Observación |
| --- | --- | --- | --- | --- |
| COMERCIAL | PARCIAL | 2026-10-01 00:00 | 2026-10-15 18:00 | Sólo datos ficticios para el mockup; no representan cobertura empresarial real |
| FINANCIERO | PARCIAL | 2026-10-01 00:00 | 2026-10-15 18:00 | Sólo datos ficticios para el mockup; no representan cobertura empresarial real |
| LOGISTICO | PARCIAL | 2026-10-01 00:00 | 2026-10-15 18:00 | Sólo datos ficticios para el mockup; no representan cobertura empresarial real |
| CALIDAD | PARCIAL | 2026-10-01 00:00 | 2026-10-15 18:00 | Sólo datos ficticios para el mockup; no representan cobertura empresarial real |

En cada tablero mostrar período consultado, corte20 oct18:00, zonaAmerica/Managua y aviso de cobertura parcial. Cobertura completa es un estado alternativo de diseño, nunca una afirmación real sobre estos datos.

## 12. Formularios y acciones de las fuentes dentro del administrador

| Fuente | Formulario / acción | Datos precargados del ejemplo |
| --- | --- | --- |
| Contrato | Registrar / terminar / renovar | CLI-001, CON-001, fechas y4200.00; renovación propone nuevo registro, no sobrescribe anterior |
| Comprobante | Registrar / consultar / anular | DOC-001, cliente001, líneaCAT-001, total1320.00; anular exige motivo, fecha y ausencia de cobros vigentes |
| Cobro | Registrar / revertir | Aplicaciones al comprobante; importe calculado por suma, impedir sobrecobro |
| Costo | Registrar / revertir | MANO_OBRA,924.00, cliente001, DOC-001; conservar historial |
| Servicio realizado | Registrar / aplicar a línea | FAC-013,1.000; seleccionar línea del mismo cliente/concepto/unidad |
| Artículo | Registrar / apertura | ART-001,unidad,mínimo10.000, apertura20.000,costo100.000000 |
| Movimiento | Entrada / consumo / devolución / ajuste / reverso permitido | Consumo2.000; devolución vinculada al consumo y sin superar su cantidad/costo |
| Compra | Registrar / recibir parcialmente / cancelar pendiente | CMP-001,20líneas; recepción por línea con fecha, cantidad y referencia |
| Herramienta | Registrar / prestar / devolver | HER-001, técnico activo, fecha y devolución prevista; impedir dos préstamos abiertos |
| Garantía | Registrar / consultar | GAR-001,cliente001,equipo001, fechas y cobertura |
| Caso | Registrar / responder / resolver / cerrar | CAS-004; fechas y plazos, resultado/causa al resolver, cerrar sólo con correctivas cerradas |
| Retrabajo | Registrar desde caso | Referencia única, fecha, motivo y OT opcional |
| Correctiva | Crear desde caso / cerrar | Responsable activo, creación, vencimiento, cierre y resultado |

## 13. Estados visuales completos y comportamiento del prototipo

| Estado | Contenido exacto / regla |
| --- | --- |
| Cargando | Skeleton de tarjetas y filas; texto Cargando información…; no sustituir por ceros falsos |
| Vacío inicial | Todavía no hay registros. Acción primaria correspondiente al módulo |
| Sin resultados | No encontramos resultados con estos filtros. Limpiar filtros |
| Error de consulta | No se pudo cargar la información. Reintentar; conservar filtros y formulario |
| Validación | Campo requerido; fecha fuera de rango; cantidad inválida; importe supera saldo; mostrar junto al campo |
| Conflicto de edición | El registro cambió. Se conservan tus datos. Vuelve al listado y abre el registro actualizado |
| Sin permiso | No tienes permiso para esta acción; no mostrar controles operables |
| Confirmación destructiva | Anular o revertir conserva el historial; pedir motivo y fecha |
| Éxito | Registro guardado correctamente; actualizar listado y detalle |
| Offline | Sin conexión. Conserva los campos; permitir reintento al recuperar red |
| IA no configurada | El asistente no está configurado; indicadores y consultas siguen disponibles |
| IA cargando | Preparando interpretación… sólo después de pulsar Explicar indicadores |
| IA respuesta visual simulada | Interpretación de demostración: cobertura parcial, ventas registradasC$21000.00, facturaciónC$16680.00, cobrosC$14600.00 y margen30.00%. No atribuir esta frase a una llamada real aDeepSeek |
| IA error | No se pudo generar la interpretación. Intenta de nuevo más tarde; no ocultar ni alterar métricas |
| Rango cambiado | Recalcular tablas/KPIs desde el conjunto; eliminar interpretación previa para evitar datos obsoletos |
| Acciones de formulario | Abrir formulario por acción, Guardar/Cancelar; actualizar sólo datos del prototipo; no enviar al backend real |
| Enlaces | ReferenciasDEMO abren detalles del mismo conjunto; no simular navegación a registros reales de otro entorno |

## 14. Cobertura funcional real frente al mockup solicitado

| Área | En el Markdown | Situación del MVP actual |
| --- | --- | --- |
| A.1 | CRM integral con contactos, ubicaciones, fiscal, clasificación, documentación e historial | Complemento CRM implementado; pestañas relacionadas dependen de las fuentes/módulos disponibles |
| A.2 | Cotizaciones, seguimiento, ventas, pedidos y aprobaciones | Cotizaciones/decisiones/ventas implementadas; pedidos como módulo independiente requieren ampliación |
| A.3 | Catálogo, costos/precios, tarifas estándar/cliente/contrato y descuentos | Catálogo y tarifas estándar/cliente implementados; tarifa por contrato y aprobación avanzada de descuentos requieren ampliación |
| A.4 | Administración de cuenta y vista previa integral del portal | Cuentas, autenticación y cotizaciones implementadas; autoservicio integral/previewadmin requieren ampliación |
| H.5–H.8 | Todos sus indicadores, filtros, desgloses y fuentes mínimas | Implementados con fuentes persistidas y cálculos deterministas; estos registros son sólo ficticios para diseño |

Este archivo permite generar las pantallas del alcance original completo desde ADMIN, pero no certifica que las partes señaladas como ampliación ya funcionen en el software. No reemplaza ni amplía el código de los módulos del compañero. No requiere ejecutar ninguna migración ni poblar una base de datos.
