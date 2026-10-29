# Verificación visual — Resumen general y demo local

Fecha: 27 de octubre de 2026.

## Evidencia comparada

Referencia: `/home/warr/Imágenes/screenshot_20261027_182755-region.png` (1910 × 901).
Implementación: `http://localhost:5173/dashboard`, sesión de administrador, 1910 × 900, escala 1. La diferencia de un píxel corresponde al recorte de la referencia.

Capturas locales, fuera de Git:

- `/home/warr/.local/share/trackon-local/qa/dashboard-desktop.png`
- `/home/warr/.local/share/trackon-local/qa/comparacion-final.png` — referencia e implementación juntas, abiertas y comparadas visualmente.
- `/home/warr/.local/share/trackon-local/qa/dashboard-mobile.png` — 375 × 812, menú cerrado.
- `/home/warr/.local/share/trackon-local/qa/menu-mobile.png` — 375 × 812, menú abierto.
- `/home/warr/.local/share/trackon-local/qa/cotizaciones.png`

## Iteraciones y correcciones

La primera comparación detectó diferencias de densidad: sidebar más estrecho, tarjetas de indicadores de mayor altura y tipografía dependiente de la fuente del equipo. Se ajustaron la columna lateral a 326 px en escritorio amplio, las tarjetas a 116 px, los espacios entre secciones y se agregó Inter local en pesos 400/500/600/700. La captura final conserva las seis tarjetas en una fila, operación y alertas en dos columnas, y actividad reciente debajo, como la referencia.

Se corrigió además el selector de período para que pulsar el período activo no deje la vista cargando. El menú móvil cerrado deja de participar en la navegación por teclado; al abrirlo se muestran sus grupos y acciones. Las capturas móviles esperan a que termine la transición.

No quedan diferencias P0/P1/P2 en el alcance implementado.

## Superficies revisadas

| Superficie | Resultado |
| --- | --- |
| Tipografía | Inter servida localmente; jerarquía, pesos, etiquetas y tamaños coherentes con la captura. |
| Espaciado y composición | Sidebar, cabecera, márgenes, seis indicadores, paneles, radios y divisores comparados a la misma anchura. |
| Color y tokens | Primario azul, estructura morada, fondo neutro y estados semánticos reutilizados. Estados con texto, no sólo color. |
| Recursos gráficos | Se conserva el logo institucional real; iconos de biblioteca Phosphor. Sin imágenes estiradas ni recursos promocionales. |
| Contenido | Datos de demostración persistidos y relacionados; cantidades y estados proceden de la base. Sin códigos de subsistema en encabezados. |

## Diferencias intencionales

La referencia es visual: sus cifras, nombre de administradora y estados de órdenes no se copian como valores fijos. Se conservan la cuenta local, los estados reales del sistema y sus operaciones. Se omiten Module Coverage, menús de módulos inexistentes y controles sin función. El logo institucional existente se conserva en lugar del monograma del mockup. El selector admite Hoy/Semana/Mes y actualización; no se agrega un selector Rango sin implementar. Las cuentas por cobrar y el inventario reflejan el estado actual; la facturación y los cobros corresponden al período solicitado.

El menú conserva los grupos de negocio y las funciones existentes. Inteligencia queda al final. La adaptación móvil usa tarjetas en dos columnas y navegación en drawer; no existe una referencia móvil para comparación exacta.

## Comprobaciones funcionales

- Inicio de sesión de administrador redirige al resumen; restaurar enlaces directos conserva su destino.
- Selector de período, actualización, búsqueda de módulos y menús funcionan.
- CRM carga una ficha inicial con contactos, notas, documentos e historial disponibles.
- Comercial, portal administrado, cuatro tableros, cuatro grupos de fuentes, órdenes, agenda, técnicos y administración se recorrieron en navegador sin errores JavaScript ni respuestas HTTP 5xx.
- Sin desbordamiento horizontal a 375 px; drawer abre correctamente.
- Al menos 100 registros en las 33 entidades principales verificadas; 500 conceptos, 600 tarifas, 200 cotizaciones y 300 movimientos.
- Totales de cotizaciones y comprobantes, aplicaciones de cobros y saldos de inventario consistentes.
- 100 evidencias PDF con archivos existentes; extracción de texto de un informe verificada.
- Pruebas de frontend afectadas, integración del resumen financiero en una base QA independiente, build y lint aprobados.

## Seguimiento opcional

P3: se pueden afinar posteriormente los textos y el contenido de las alertas según nuevas reglas de negocio. No se consideran una réplica de cifras o funcionalidades ausentes de la referencia.

final result: passed
