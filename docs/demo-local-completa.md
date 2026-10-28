# Demo local completa

El resumen general es la entrada de administradores y gerentes al iniciar sesión. Los técnicos ingresan a TrackOn Field. Los enlaces directos se conservan al restaurar una sesión.

El menú usa nombres de negocio sin códigos, grupos expandibles y los módulos existentes. Inteligencia aparece al final. El buscador de la cabecera localiza módulos. El resumen muestra facturación y cobros del período elegido; cuentas por cobrar e inventario corresponden al estado actual. La operación de hoy conserva sus datos diarios.

## Carga de datos

Requiere PostgreSQL local con las migraciones aplicadas, catálogos iniciales y el usuario `administrador` creados según [desarrollo local](desarrollo-local.md). Exportar `DATABASE_URL`, `AUTH_ACCESS_TOKEN_SECRET` y `EVIDENCE_STORAGE_DIR` del entorno local y ejecutar:

```bash
NODE_ENV=development TRACKON_ALLOW_DEMO_DATA=true pnpm seed:demo:completo
```

El comando verifica que la base sea local y rechaza producción. Usa referencias `DEMO-`, no borra registros y puede repetirse sin duplicar el conjunto. Los clientes se crean en transacciones junto con sus relaciones; si una transacción falla puede reintentarse. Los archivos de evidencia se guardan fuera de Git en el almacenamiento configurado.

| Datos ficticios | Cantidad |
| --- | ---: |
| Clientes, perfiles, contactos, ubicaciones, notas y referencias documentales | 100 de cada uno |
| Empleados, usuarios técnicos, cuadrillas, equipos, servicios y materiales | 100 de cada uno |
| Conceptos comerciales, cotizaciones y tarifas | 500 conceptos (100 por categoría), 200 cotizaciones y 600 tarifas |
| Ventas y cuentas de portal | 100 de cada uno |
| Órdenes, intervenciones e informes PDF descargables | 100 de cada uno |
| Contratos, servicios facturables y casos de calidad | 200 de cada uno |
| Comprobantes, cobros, aplicaciones y costos | 100 de cada uno |
| Artículos, compras, recepciones, herramientas y préstamos | 100 de cada uno |
| Movimientos de inventario | 300 |
| Garantías, retrabajos y acciones correctivas | 100 de cada uno |
| Notificaciones y eventos de auditoría | 100 de cada uno |
| Coberturas de indicadores | Las cuatro áreas existentes |

Los datos incluyen estados variados, saldos parciales, facturas vencidas, stock bajo, préstamos abiertos y devueltos, reclamos resueltos y pendientes, reincidencias y contratos renovados. Son datos de demostración sin validez operativa. Los catálogos cerrados, como roles y estados, mantienen únicamente sus valores reales.

## Accesos de demostración

Se conserva la cuenta local `administrador` y su contraseña existente. El seed agrega `demo.tecnico1` a `demo.tecnico100`, y `demo.cliente1` a `demo.cliente100` en el portal, con la contraseña de demostración `TrackOn-Demo-2026!`. Los identificadores de portal corresponden a clientes independientes; sus cotizaciones están relacionadas con el cliente correcto.

La IA mantiene la configuración existente de DeepSeek; estos datos no configuran una clave ni simulan una respuesta del proveedor.
