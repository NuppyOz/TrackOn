# Comercial e indicadores H.5–H.8

Los módulos comerciales y gerenciales se agregan sobre las rutas existentes. Sus escrituras requieren ADMIN o GTE_OPE; las cuentas de portal se administran como ADMIN. No se generan órdenes de trabajo ni asientos contables automáticamente.

## Inicio

Aplicar migraciones con `pnpm --dir apps/api exec prisma migrate deploy` y generar cliente con `pnpm --dir apps/api exec prisma generate`. Configurar DATABASE_URL y AUTH_ACCESS_TOKEN_SECRET como en el entorno existente. Las migraciones agregan tablas propias y relaciones inversas; no transforman datos operativos previos.

Comercial incluye contactos/perfil/documentos referenciados e historial, catálogo y tarifas, cotizaciones/decisiones y ventas originadas en cotización aprobada. Los documentos adjuntos son referencias HTTPS: el servidor no descarga su contenido. La cuenta de cliente se crea desde Comercial, y el cliente inicia sesión en `/portal` con credenciales independientes del acceso de empleados. El portal MVP consulta y decide cotizaciones; no habilita acceso interno ni registro público.

PORTAL_ALLOWED_ORIGIN debe coincidir con el origen público exacto del frontend (protocolo, host y puerto; sin barra final ni ruta). Vite local usa http://localhost:5173 por defecto. En producción usar HTTPS; las cookies del portal se emiten HttpOnly, SameSite=Strict y Secure. Cambiar puerto de frontend implica actualizar el origen configurado.

## Origen de los indicadores

H.5 usa cotizaciones y ventas comerciales, además de contratos gerenciales mínimos. H.6 usa comprobantes registrados con sus importes finales, cobros/aplicaciones, costos y servicios realizados pendientes de facturar. Capturar un comprobante no lo emite fiscalmente. H.7 usa artículos, movimientos, compromisos/recepciones y préstamos de herramientas propios; no modifica el stock de materiales operativos existentes. H.8 usa garantías, casos, retrabajos y correctivas registrados expresamente; no incorpora nómina ni RRHH.

Registrar los datos en Inteligencia → Registros de origen, y declarar el intervalo efectivamente revisado en Cobertura de los datos. Cobertura parcial o ausencia de base se muestran en el tablero; no representan cero actividad empresarial. Las tasas sin denominador se muestran sin base. Los valores monetarios y cantidades se calculan con precisión decimal; la valoración logística conserva nueve decimales.

Los rangos son [desde,hasta), máximo366d, zona horaria America/Managua. Hasta futuro se recorta al momento de consulta. Los saldos se reconstruyen al corte efectivo; anulaciones, devoluciones y cierres conservan historial. Las fechas de captura no sustituyen las fechas efectivas. En calidad, la orden de garantía es la de origen y puede diferir de la orden relacionada con el reclamo.

## Explicación opcional con DeepSeek

Configurar `DEEPSEEK_API_KEY` únicamente en el entorno del backend o en el `.env` local ignorado por Git. Docker Compose la transmite sólo al servicio API, que dispone de una red adicional de egreso para consultar al proveedor. La base de datos y las migraciones conservan su red interna. `DEEPSEEK_MODEL` permite seleccionar un modelo compatible; por defecto usa `deepseek-flash`. No colocar la key en variables `VITE_*`, código, documentos ni mensajes.

Cada tablero ofrece una explicación a demanda. El backend vuelve a consultar sus indicadores y envía al proveedor únicamente agregados: valores, unidades, bases, rango y estado/fechas de cobertura. No envía desgloses, clientes, documentos, contactos, observaciones ni credenciales de TrackOn. La respuesta es una interpretación generada, acompañada de su rango/corte y referencia de consulta; los cálculos y registros siguen siendo la fuente de verdad.

Sin key, con el proveedor caído o al alcanzar el límite de solicitudes simultáneas, la explicación queda no disponible y los tableros siguen funcionando. No se envían solicitudes al proveedor al abrir o filtrar un tablero. La integración no ejecuta SQL, herramientas ni acciones sobre registros, y no incorpora un chat de instrucciones libres.

Las pruebas automáticas usan un proveedor simulado; la conexión real se verifica después de configurar la key localmente. Referencia del proveedor: [API de chat DeepSeek](https://api-docs.deepseek.com/api/create-chat-completion/).
