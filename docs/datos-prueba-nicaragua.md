# Datos de prueba con clientes reales de Nicaragua

Los seeds de demostración (`seed-demo.ts`, `seed-demo-completo.ts`, `seed-dev-data.ts`) se
eliminaron: sus clientes eran inventados ("Clínica Central Sur", "Frío Centro Nicaragua S.A.")
y no servían para mostrar la aplicación a un cliente del taller. En su lugar está
`apps/api/prisma/seed-nicaragua.ts`.

## Qué es real

| Dato | Origen |
| --- | --- |
| Razón social, nombre comercial | Sitios web propios, Google Maps, directorios públicos (noviembre 2026) |
| Teléfono, correo, sitio web | Sitio de la empresa y fichas públicas |
| Dirección | Sitio, Google Maps y directorios; se conserva el punto de referencia tal como lo describe la empresa |
| RUC de ETECH, S.A. y CCN | Publicados en registros comerciales (`J0310000013918`, `J0310000001960`) |

Los RUC que no están publicados son **números de trabajo**: no son el RUC oficial y hay que
validarlos contra la constancia de la DGI antes de facturar. El perfil comercial de cada
cliente lo deja anotado, y el seed marca `rucVerificado` en el código.

Los contactos son referenciales por cargo (gerente de tienda, jefe de mantenimiento):
el nombre es de trabajo hasta que el cliente lo confirme.

## Qué no es real

Tarifas, consumos, órdenes, cotizaciones, comprobantes, cobros, costos, inventario,
nombres del personal de MULTICAS y proveedores. Son cifras coherentes para probar la
aplicación, no historia contable. Los montos están en córdobas y siguen precios de
taller: mantenimiento de minisplit C$1 850, cuarto frío C$4 800, cambio de compresor
C$14 500, contrato preventivo anual entre C$72 000 y C$150 000.

## Clientes cargados

Distribuidores de tecnología y climatización:

- SEVASA — Altamira y Carretera a Masaya km 13.4
- Comtech — Altamira D'Este No. 589 y bodega de la Pista Juan Pablo II
- Conico — Altamira (de Sinsa Proyectos 2 c. al sur) y Las Brisas
- SICSA — tienda y centro de servicio (dirección por confirmar con el cliente)
- eTech — Altamira, 5 c. al norte de donde fue LOZELSA
- Telmovil — casa matriz El Güegüense, Metrocentro PA-10A, Multicentro Las Américas
- CLIMERSA — del Cementerio Central 2 c. al sur
- Importaciones Climatec — del Ministerio del Trabajo 5 c. al este

Operaciones que dependen de frío:

- Supermercados La Colonia — sucursales Sur y Veracruz
- PriceSmart — 6a Avenida SO
- Hospital Vivian Pellas — km 9.75 Carretera a Masaya
- Hospital Bautista — barrio Largaespada
- Real InterContinental Managua — frente a Metrocentro
- Hotel Colonial Granada — calle Libertad, Granada
- Selva Negra — km 140 Carretera Matagalpa–Jinotega
- Nuevo Carnic — Carretera Norte km 10½
- Centrolac (La Perfecta) — planta Tipitapa
- Eskimo — planta Montoya y centro de distribución Salamanca
- Tip Top (Deli Pollo) — Rotonda Universitaria y Carretera a Masaya
- CCN — km 6½ Carretera Norte

Cada cliente trae ubicaciones, equipos con marca/modelo/serie coherentes con su giro
(minisplits en tiendas, cámaras y racks en retail alimentario, chiller y manejadoras en
hospitales y hoteles, túneles y compresores en industria), contactos, notas comerciales,
cuenta de portal y perfil de facturación.

## Volumen generado

- 20 clientes, 28 ubicaciones, 61 equipos.
- 2 a 3 intervenciones por equipo en los últimos doce meses: órdenes en todos los estados,
  con diagnóstico, materiales, informe PDF, revisión de evidencia, historial y asignación.
  Reparto verificado: 121 cerradas, 11 en revisión, 9 asignadas, 8 en ejecución y 7 pendientes.
- Prioridades de la visita, no la gravedad del equipo: 4 urgentes, 60 altas, 51 medias y
  41 bajas. Lo urgente queda para lo que sigue abierto, así el tablero no parece alarmado.
- 3 cotizaciones por cliente en estados variados (16 aprobadas con venta, 28 enviadas,
  12 en borrador y 4 rechazadas) y contratos preventivos para clientes preferentes y
  empresariales, con el contrato anterior enlazado.
- Comprobantes, facturables, cobros parciales y totales, y costos de mano de obra y material.
- Garantías por intervención; casos de calidad, retrabajos, correctivas y reincidencias
  en una de cada cinco órdenes.
- 20 repuestos con movimientos de apertura, compra, recepción y consumo; 7 herramientas
  con préstamos abiertos y devueltos; coberturas de las cuatro áreas de indicadores.

## Cómo cargarlo

```bash
# Roles y estados (sólo en una base nueva; el reset los conserva)
pnpm --dir apps/api exec tsx prisma/seed.ts

# Datos de prueba: reinicia la base de negocio
TRACKON_ALLOW_SEED_DATA=true pnpm seed:datos
```

El script:

1. Vacia todas las tablas de negocio con `TRUNCATE … RESTART IDENTITY CASCADE`, dejando
   intactas `roles`, `estados_orden`, `_prisma_migrations` y las cuentas locales con sus
   personas (`usuarios`, `personas`, `empleados`). **No cambia contraseñas.**
2. Borra los informes de evidencia que quedaron huérfanos de la carga anterior: al vaciar
   `evidencias_equipo`, ningún archivo del almacenamiento local vuelve a estar referenciado.
   Sólo elimina archivos con forma de clave (UUID de 36 caracteres) dentro de
   `EVIDENCE_STORAGE_DIR`; cualquier otro archivo de esa carpeta se respeta.
3. Elimina las cuentas y los empleados del seed anterior (`demo.tecnico*`, `DEMO-EMP-*`),
   que sobreviven al `TRUNCATE` porque sostienen las cuentas locales.
4. Carga catálogos, clientes reales, equipos, historia operativa, comercial y financiera.

Rechaza `NODE_ENV=production` y cualquier `DATABASE_URL` que no apunte a
`localhost`/`127.0.0.1`. Los informes de evidencia en PDF se guardan en
`EVIDENCE_STORAGE_DIR`, fuera de Git.

**Es idempotente.** Dos corridas seguidas dejan exactamente la misma base: los conteos no
cambian (156 órdenes, 60 cotizaciones, 121 comprobantes) y el almacenamiento de evidencias
vuelve a quedar en 121 archivos, uno por comprobante. El script imprime al final el reparto
por estado y por prioridad, para verificarlo sin abrir la app.

## Cuentas

Se conservan las cuentas locales que ya existan (`administrador`, `tecnico`, …) con su
contraseña actual, así que el reset no deja al usuario fuera de la aplicación. Para un
tercer perfil (por ejemplo un gerente que revise cierres) se crea desde
**Administración → Usuarios y permisos**.

Las cuentas de portal de cliente usan el identificador `portal.<nombre>` y la contraseña
`Portal-Cliente-2026!`; son cuentas de prueba local del portal.
