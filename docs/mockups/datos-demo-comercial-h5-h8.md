# Datos ficticios para mockup — TrackOn

> Para generar todo el panel ADMIN, usar [el archivo completo A.1–A.4 y H.5–H.8](dashboard-admin-completo-a-h5-h8.md). Este documento conserva el conjunto inicial de referencia.

Archivo de referencia visual; no ejecuta SQL ni modifica la base de datos. Las referencias DEMO son etiquetas para relacionar registros, no IDs reales de PostgreSQL. No incluye credenciales ni datos personales reales.

## Convenciones

- Corte: 20 de octubre de 2026, 18:00, America/Managua. Período: 1 de octubre hasta ese corte.
- Moneda: NIO. Importes con dos decimales y cantidades con tres.
- Cotizaciones de un servicio, cantidad 1.000, sin descuentos ni impuestos en este ejemplo. Esto no define una regla tributaria.
- Precios habituales entre C$1320.00 y C$1480.00; promedio C$1400.00, desviación poblacional aproximada C$56.57 (4.04%). Variación pequeña, sin valores extremos.
- Fechas y estados son consistentes con el corte. Las entidades se capturan por sus formularios/API; una venta no crea automáticamente factura ni OT.

## 1. Clientes / CRM — 20 entradas

| Referencia | Nombre comercial ficticio | Clasificación | Ubicación principal | Contacto ficticio | Correo | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| DEMO-CLI-001 | Café Las Brisas | REGULAR | Managua · Local principal | Contacto de compras 01 | compras01@example.com | Activo |
| DEMO-CLI-002 | Panadería El Molino | REGULAR | Managua · Local principal | Contacto de compras 02 | compras02@example.com | Activo |
| DEMO-CLI-003 | Minimarket Los Pinos | REGULAR | Managua · Local principal | Contacto de compras 03 | compras03@example.com | Activo |
| DEMO-CLI-004 | Farmacia La Plaza | REGULAR | Managua · Local principal | Contacto de compras 04 | compras04@example.com | Activo |
| DEMO-CLI-005 | Restaurante El Patio | REGULAR | Managua · Local principal | Contacto de compras 05 | compras05@example.com | Activo |
| DEMO-CLI-006 | Oficina Alameda | REGULAR | Managua · Local principal | Contacto de compras 06 | compras06@example.com | Activo |
| DEMO-CLI-007 | Clínica Buen Día | REGULAR | Managua · Local principal | Contacto de compras 07 | compras07@example.com | Activo |
| DEMO-CLI-008 | Hotel Los Robles | REGULAR | Managua · Local principal | Contacto de compras 08 | compras08@example.com | Activo |
| DEMO-CLI-009 | Librería Central | REGULAR | Managua · Local principal | Contacto de compras 09 | compras09@example.com | Activo |
| DEMO-CLI-010 | Comedor La Terraza | REGULAR | Managua · Local principal | Contacto de compras 10 | compras10@example.com | Activo |
| DEMO-CLI-011 | Tienda El Parque | REGULAR | Managua · Local principal | Contacto de compras 11 | compras11@example.com | Activo |
| DEMO-CLI-012 | Consultorio Primavera | REGULAR | Managua · Local principal | Contacto de compras 12 | compras12@example.com | Activo |
| DEMO-CLI-013 | Cafetería La Esquina | REGULAR | Managua · Local principal | Contacto de compras 13 | compras13@example.com | Activo |
| DEMO-CLI-014 | Oficina Mirador | REGULAR | Managua · Local principal | Contacto de compras 14 | compras14@example.com | Activo |
| DEMO-CLI-015 | Panadería San José | REGULAR | Managua · Local principal | Contacto de compras 15 | compras15@example.com | Activo |
| DEMO-CLI-016 | Minimarket La Fuente | REGULAR | Managua · Local principal | Contacto de compras 16 | compras16@example.com | Activo |
| DEMO-CLI-017 | Restaurante Los Cedros | REGULAR | Managua · Local principal | Contacto de compras 17 | compras17@example.com | Activo |
| DEMO-CLI-018 | Farmacia Las Flores | REGULAR | Managua · Local principal | Contacto de compras 18 | compras18@example.com | Activo |
| DEMO-CLI-019 | Hotel Jardines | REGULAR | Managua · Local principal | Contacto de compras 19 | compras19@example.com | Activo |
| DEMO-CLI-020 | Clínica Horizonte | REGULAR | Managua · Local principal | Contacto de compras 20 | compras20@example.com | Activo |

El nombre de clasificación REGULAR es una etiqueta propuesta para el mockup; usar el catálogo disponible al cargar datos. Los contactos y ubicaciones pertenecen al cliente de su misma fila.

## 2. Catálogo y tarifario estándar

| Concepto | Nombre | Tipo | Unidad | Costo de referencia | Precio de venta | Tarifa |
| --- | --- | --- | --- | --- | --- | --- |
| DEMO-SRV-01 | Limpieza de unidad interior | SERVICIO | servicio | 924.00 | 1320.00 | Estándar activa |
| DEMO-SRV-02 | Revisión técnica de climatización | SERVICIO | servicio | 952.00 | 1360.00 | Estándar activa |
| DEMO-SRV-03 | Mantenimiento preventivo básico | SERVICIO | servicio | 980.00 | 1400.00 | Estándar activa |
| DEMO-SRV-04 | Limpieza de condensador | SERVICIO | servicio | 1008.00 | 1440.00 | Estándar activa |
| DEMO-SRV-05 | Mantenimiento de refrigeración comercial | SERVICIO | servicio | 1036.00 | 1480.00 | Estándar activa |

## 3. Cotizaciones — 20 entradas

Todas creadas el 2 de octubre a las 09:00. Excepto el borrador, enviadas el 3 de octubre a las 09:00. Las aprobaciones ocurren el 5 de octubre y las ventas el 6 de octubre.

| Referencia | Cliente | Concepto | Cantidad | Total NIO | Estado mostrado | Vigencia hasta |
| --- | --- | --- | --- | --- | --- | --- |
| DEMO-COT-001 | DEMO-CLI-001 | DEMO-SRV-01 | 1.000 | 1320.00 | APROBADA | 2026-10-31 |
| DEMO-COT-002 | DEMO-CLI-002 | DEMO-SRV-02 | 1.000 | 1360.00 | APROBADA | 2026-10-31 |
| DEMO-COT-003 | DEMO-CLI-003 | DEMO-SRV-03 | 1.000 | 1400.00 | APROBADA | 2026-10-31 |
| DEMO-COT-004 | DEMO-CLI-004 | DEMO-SRV-04 | 1.000 | 1440.00 | APROBADA | 2026-10-31 |
| DEMO-COT-005 | DEMO-CLI-005 | DEMO-SRV-05 | 1.000 | 1480.00 | APROBADA | 2026-10-31 |
| DEMO-COT-006 | DEMO-CLI-006 | DEMO-SRV-01 | 1.000 | 1320.00 | APROBADA | 2026-10-31 |
| DEMO-COT-007 | DEMO-CLI-007 | DEMO-SRV-02 | 1.000 | 1360.00 | APROBADA | 2026-10-31 |
| DEMO-COT-008 | DEMO-CLI-008 | DEMO-SRV-03 | 1.000 | 1400.00 | APROBADA | 2026-10-31 |
| DEMO-COT-009 | DEMO-CLI-009 | DEMO-SRV-04 | 1.000 | 1440.00 | APROBADA | 2026-10-31 |
| DEMO-COT-010 | DEMO-CLI-010 | DEMO-SRV-05 | 1.000 | 1480.00 | APROBADA | 2026-10-31 |
| DEMO-COT-011 | DEMO-CLI-011 | DEMO-SRV-01 | 1.000 | 1320.00 | APROBADA | 2026-10-31 |
| DEMO-COT-012 | DEMO-CLI-012 | DEMO-SRV-02 | 1.000 | 1360.00 | APROBADA | 2026-10-31 |
| DEMO-COT-013 | DEMO-CLI-013 | DEMO-SRV-03 | 1.000 | 1400.00 | APROBADA | 2026-10-31 |
| DEMO-COT-014 | DEMO-CLI-014 | DEMO-SRV-04 | 1.000 | 1440.00 | APROBADA | 2026-10-31 |
| DEMO-COT-015 | DEMO-CLI-015 | DEMO-SRV-05 | 1.000 | 1480.00 | APROBADA | 2026-10-31 |
| DEMO-COT-016 | DEMO-CLI-016 | DEMO-SRV-01 | 1.000 | 1320.00 | ENVIADA | 2026-10-31 |
| DEMO-COT-017 | DEMO-CLI-017 | DEMO-SRV-02 | 1.000 | 1360.00 | ENVIADA | 2026-10-31 |
| DEMO-COT-018 | DEMO-CLI-018 | DEMO-SRV-03 | 1.000 | 1400.00 | BORRADOR | 2026-10-31 |
| DEMO-COT-019 | DEMO-CLI-019 | DEMO-SRV-04 | 1.000 | 1440.00 | RECHAZADA | 2026-10-31 |
| DEMO-COT-020 | DEMO-CLI-020 | DEMO-SRV-05 | 1.000 | 1480.00 | VENCIDA | 2026-10-18 |

VENCIDA es el estado efectivo de DEMO-COT-020: fue enviada y no decidida antes del vencimiento. No se fuerza como transición manual. DEMO-COT-019 fue rechazada el 5 de octubre.

## 4. Ventas, comprobantes, cobros y costos

Ventas DEMO-VTA-001 a 015: una por cada cotización aprobada del mismo número, confirmadas el 6 de octubre a las 09:00. No crear ventas para cotizaciones 016–020.

Los siguientes comprobantes se registran el 7 de octubre a las 09:00, vencen el 25 de octubre y tienen una línea del concepto de su cotización. Emisor: MULTICAS DEMO. Cada cobro es del 9 de octubre y se aplica solamente a su comprobante. Costos del 8 de octubre, categoría MANO_OBRA, vinculados al cliente y comprobante. Sin anulaciones ni reversos en esta muestra.

| Venta | Comprobante | Cliente | Importe final | Cobro | Pagado | Saldo | Costo | Importe costo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DEMO-VTA-001 | DEMO-DOC-001 | DEMO-CLI-001 | 1320.00 | DEMO-COB-001 | 1320.00 | 0.00 | DEMO-COS-001 | 924.00 |
| DEMO-VTA-002 | DEMO-DOC-002 | DEMO-CLI-002 | 1360.00 | DEMO-COB-002 | 1360.00 | 0.00 | DEMO-COS-002 | 952.00 |
| DEMO-VTA-003 | DEMO-DOC-003 | DEMO-CLI-003 | 1400.00 | DEMO-COB-003 | 1400.00 | 0.00 | DEMO-COS-003 | 980.00 |
| DEMO-VTA-004 | DEMO-DOC-004 | DEMO-CLI-004 | 1440.00 | DEMO-COB-004 | 1440.00 | 0.00 | DEMO-COS-004 | 1008.00 |
| DEMO-VTA-005 | DEMO-DOC-005 | DEMO-CLI-005 | 1480.00 | DEMO-COB-005 | 1480.00 | 0.00 | DEMO-COS-005 | 1036.00 |
| DEMO-VTA-006 | DEMO-DOC-006 | DEMO-CLI-006 | 1320.00 | DEMO-COB-006 | 1320.00 | 0.00 | DEMO-COS-006 | 924.00 |
| DEMO-VTA-007 | DEMO-DOC-007 | DEMO-CLI-007 | 1360.00 | DEMO-COB-007 | 1360.00 | 0.00 | DEMO-COS-007 | 952.00 |
| DEMO-VTA-008 | DEMO-DOC-008 | DEMO-CLI-008 | 1400.00 | DEMO-COB-008 | 1400.00 | 0.00 | DEMO-COS-008 | 980.00 |
| DEMO-VTA-009 | DEMO-DOC-009 | DEMO-CLI-009 | 1440.00 | DEMO-COB-009 | 1440.00 | 0.00 | DEMO-COS-009 | 1008.00 |
| DEMO-VTA-010 | DEMO-DOC-010 | DEMO-CLI-010 | 1480.00 | DEMO-COB-010 | 740.00 | 740.00 | DEMO-COS-010 | 1036.00 |
| DEMO-VTA-011 | DEMO-DOC-011 | DEMO-CLI-011 | 1320.00 | DEMO-COB-011 | 660.00 | 660.00 | DEMO-COS-011 | 924.00 |
| DEMO-VTA-012 | DEMO-DOC-012 | DEMO-CLI-012 | 1360.00 | DEMO-COB-012 | 680.00 | 680.00 | DEMO-COS-012 | 952.00 |

### Servicios realizados pendientes de facturar

Registrar primero los 15 servicios realizados DEMO-FAC-001 a 015 el 6 de octubre a las 15:00, cantidad 1.000, cliente y concepto de su venta. Los primeros doce se aplican íntegramente a la línea de su comprobante el 7 de octubre a las 10:00; los siguientes tres conservan cantidad pendiente 1.000. No son órdenes de trabajo nuevas.

| Facturable | Venta | Cliente | Concepto | Cantidad pendiente |
| --- | --- | --- | --- | --- |
| DEMO-FAC-013 | DEMO-VTA-013 | DEMO-CLI-013 | DEMO-SRV-03 | 1.000 |
| DEMO-FAC-014 | DEMO-VTA-014 | DEMO-CLI-014 | DEMO-SRV-04 | 1.000 |
| DEMO-FAC-015 | DEMO-VTA-015 | DEMO-CLI-015 | DEMO-SRV-05 | 1.000 |

## 5. Contratos gerenciales mínimos

| Referencia | Cliente | Inicio | Fin | Importe NIO | Estado al corte |
| --- | --- | --- | --- | --- | --- |
| DEMO-CON-001 | DEMO-CLI-001 | 2026-10-01 08:00 | 2026-12-31 18:00 | 4200.00 | Activo |
| DEMO-CON-002 | DEMO-CLI-002 | 2026-10-01 08:00 | 2026-12-31 18:00 | 4200.00 | Activo |
| DEMO-CON-003 | DEMO-CLI-003 | 2026-10-01 08:00 | 2026-12-31 18:00 | 4200.00 | Activo |

## 6. Logística — artículos, movimientos y compras

Cada artículo tiene apertura el 1 de octubre a las 08:00 y un consumo de 2.000 el 10 de octubre a las 08:00, sin OT asociada. Las referencias de movimiento son DEMO-APE-01…05 y DEMO-CONSU-01…05. Valoración por costo promedio; los importes siguientes no se redondean antes de calcular el saldo.

| Artículo | Descripción | Unidad | Mínimo | Apertura | Costo unitario NIO | Consumo | Stock al corte | Valor NIO |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DEMO-ART-01 | Filtro estándar | unidad | 10.000 | 20.000 | 100.000000 | 2.000 | 18.000 | 1800.000000000 |
| DEMO-ART-02 | Capacitor básico | unidad | 10.000 | 20.000 | 105.000000 | 2.000 | 18.000 | 1890.000000000 |
| DEMO-ART-03 | Sensor de temperatura | unidad | 10.000 | 20.000 | 110.000000 | 2.000 | 18.000 | 1980.000000000 |
| DEMO-ART-04 | Conector eléctrico | unidad | 10.000 | 20.000 | 115.000000 | 2.000 | 18.000 | 2070.000000000 |
| DEMO-ART-05 | Válvula de servicio | unidad | 10.000 | 10.000 | 120.000000 | 2.000 | 8.000 | 960.000000000 |

Compra DEMO-CMP-001: proveedor ficticio Suministros Técnicos Demo, fecha 12 de octubre a las 09:00, cinco líneas (una por artículo), cantidad 4.000 por línea, costo unitario de la tabla y entrega prometida el 23 de octubre. No tiene recepciones: no incrementar stock por una compra pendiente.

| Herramienta | Nombre | Estado al corte | Préstamo | Fecha | Devolución prevista |
| --- | --- | --- | --- | --- | --- |
| DEMO-HER-01 | Manómetro de servicio | Prestada | DEMO-PRE-01 | 2026-10-19 08:00 | 2026-10-22 17:00 |
| DEMO-HER-02 | Multímetro digital | Disponible | — | — | — |

Para DEMO-PRE-01 seleccionar un empleado activo real del entorno de demostración. No inventar su ID ni crear personal desde este archivo.

## 7. Calidad — garantías, casos y acciones

Garantías DEMO-GAR-001…003: clientes DEMO-CLI-001…003, activos DEMO-ACT-001…003 respectivamente, tipo SERVICIO, cobertura “Mano de obra del servicio realizado”, inicio 1 de octubre a las 08:00 y fin 31 de diciembre a las 18:00. No requieren equipo u OT si aún no existen esos registros.

| Caso | Cliente / activo / garantía | Falla | Abierto | Plazo respuesta | Respondido | Plazo resolución | Resuelto | Cerrado | Resultado | Caso anterior |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DEMO-CAS-001 | 001 / 001 / 001 | LIMPIEZA | 10-10 08:00 | 10-10 12:00 | 10-10 10:00 | 10-12 17:00 | 10-11 15:00 | 10-12 10:00 | PROCEDE | — |
| DEMO-CAS-002 | 001 / 001 / 001 | LIMPIEZA | 10-14 08:00 | 10-14 12:00 | 10-14 13:00 | 10-16 17:00 | 10-15 15:00 | 10-16 10:00 | PROCEDE | DEMO-CAS-001 |
| DEMO-CAS-003 | 002 / 002 / 002 | AJUSTE | 10-15 08:00 | 10-15 12:00 | 10-15 10:00 | 10-17 17:00 | 10-17 18:00 | 10-18 10:00 | PROCEDE | — |
| DEMO-CAS-004 | 003 / 003 / 003 | RUIDO | 10-19 08:00 | 10-19 12:00 | 10-19 10:00 | 10-22 17:00 | — | — | Pendiente | — |

Las fechas cortas anteriores son de octubre de 2026, hora de Managua. Los sufijos de cliente/activo/garantía se expanden a sus referencias DEMO. Descripción: “Solicitud de revisión posterior al servicio”. Causa raíz de casos resueltos: “Ajuste de procedimiento identificado en revisión”.

Retrabajos: DEMO-RET-001 para caso001 el 11 de octubre a las 09:00 y DEMO-RET-002 para caso002 el 15 de octubre a las 09:00. Motivo: “Revisión y limpieza complementaria”. No crear OT automáticamente.

| Correctiva | Caso | Descripción | Creada | Vence | Cerrada | Resultado |
| --- | --- | --- | --- | --- | --- | --- |
| DEMO-COR-001 | DEMO-CAS-001 | Verificar checklist de limpieza | 2026-10-10 11:00 | 2026-10-12 17:00 | 2026-10-11 16:00 | Checklist revisado |
| DEMO-COR-002 | DEMO-CAS-004 | Verificar ajuste y vibración | 2026-10-19 11:00 | 2026-10-22 17:00 | — | Pendiente |

Seleccionar responsables activos reales para las correctivas. Registrar y cerrar DEMO-COR-001 antes de cerrar su caso. Los casos cerrados no admiten nuevos retrabajos/correctivas.

## 8. Indicadores esperados para este mockup

Estos resultados corresponden exclusivamente a este conjunto, sin otros registros. No marcan cobertura empresarial real ni se muestran como datos reales de producción.

| Área | Indicador | Valor esperado |
| --- | --- | --- |
| H.5 | Cotizaciones / enviadas en cohorte / aprobadas | 20 / 19 / 15 |
| H.5 | Conversión de cotizaciones enviadas | 78.95% |
| H.5 | Ventas / importe / clientes con ventas | 15 / C$21000.00 / 15 |
| H.5 | Ticket promedio / contratos activos | C$1400.00 / 3 |
| H.5 | Renovaciones / tasa de renovación | 0 / Sin base |
| H.6 | Facturación / cobros / cuentas por cobrar | C$16680.00 / C$14600.00 / C$2080.00 |
| H.6 | Cuentas vencidas | C$0.00 |
| H.6 | Costos / resultado / margen | C$11676.00 / C$5004.00 / 30.00% |
| H.6 | Servicios pendientes | Tres registros, cantidad 1.000 cada uno; conservar desglose por concepto |
| H.7 | Artículos críticos / líneas de compra pendientes | 1 / 5 |
| H.7 | Herramientas prestadas / vencidas | 1 / 0 |
| H.7 | Inventario valorizado | C$8700.000000000 |
| H.8 | Garantías vigentes / casos sin cierre | 3 / 1 |
| H.8 | Reincidencias / retrabajos / grupos de fallas repetidas | 1 / 2 / 1 |
| H.8 | SLA respuesta | 75.00% = 3 de 4 plazos |
| H.8 | SLA resolución | 66.67% = 2 de 3 plazos; el cuarto aún no vence |
| H.8 | Correctivas abiertas / vencidas / casos sin plazos | 1 / 0 / 0 |

## 9. Uso en UI, portal e IA

- Usar las mismas referencias entre listados, detalles y formularios para evitar pantallas contradictorias.
- El portal de DEMO-CLI-016 muestra su cotización enviada DEMO-COT-016; no mostrarle documentos de otros clientes ni el borrador de DEMO-CLI-018.
- Historial sugerido: creación de cliente → cotización creada → enviada → aprobada → venta. Agregar comprobante/cobro sólo si el mockup muestra explícitamente esas fuentes.
- Documentos CRM: enlaces ficticios como https://example.com/documentos/demo-cli-001.pdf, etiquetados como demostración; no asumir que son archivos descargables existentes.
- Mantener cobertura PARCIAL con observación “Datos ficticios de demostración”. No declarar verificada la operación real.
- La IA recibe sólo agregados del apartado8, rango y cobertura; nunca las tablas de clientes, contactos, descripciones o documentos. No simular una respuesta como si proviniera realmente de DeepSeek.

El archivo contiene 20 entradas principales de clientes, 20 de cotizaciones y registros complementarios de las demás funciones. No necesita ejecutar scripts ni poblar una base para utilizarse en un generador de mockups.
