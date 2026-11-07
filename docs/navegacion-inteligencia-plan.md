# Plan — navegación de Inteligencia

**Estado:** propuesta para aprobación · **Base:** `dev` @ 418b121 + `fix/ux-tanda-a-c`
**Origen:** hallazgo P1-2 de `docs/odd/audits/UX-2026-11-07-menu-final.md`

---

## 1. Qué hay hoy (medido)

En `/inteligencia/origen/finanzas`, del borde superior al título «Comprobantes» hay **cuatro filas de pestañas y 335 px**:

1. **Workspace:** Operación · Indicadores de negocio · Registros de origen · Cobertura de los datos
2. **Área:** Indicadores comerciales · financieros · logísticos · de calidad
3. **Sección:** Contratos · Registros financieros · Registros logísticos · Registros de calidad
4. **Fuente:** Comprobantes · Servicios realizados · Cobros · Costos

«Lo financiero» tiene **cinco puertas**: el ítem «Finanzas y rentabilidad → Registros financieros» del menú, la pestaña «Registros de origen», la pestaña «Financiero», la fuente «Comprobantes» y el enlace «Comprobantes y cobros» del tablero. Son la misma información con cinco cromos distintos.

Dos defectos de comportamiento que acompañan al desorden:

- `FinanzasFuentesPage` guarda la fuente en `useState`: pasar de Comprobantes a Cobros **no cambia la URL**, así que no se puede compartir el enlace, recargar en esa vista ni volver con el botón atrás.
- «Operación del día» vive dentro del workspace y trae **su propia fila de cuatro pestañas** (Resumen ejecutivo · Centro operativo · Seguimiento · Indicadores).

Y un costo de mantenimiento: hay **30 enlaces a `/inteligencia/origen/*` repartidos en 10 archivos**. Cualquier cambio de ruta toca media aplicación.

---

## 2. Principio

1. **El menú lateral es el único índice global.** Dentro no se repite la lista de áreas.
2. **Una fila de navegación por nivel de información.** Área → vista. Nada más.
3. **Un filtro no es navegación.** Elegir «Cobros» en vez de «Comprobantes» filtra una tabla; va en la URL, no en otra fila de pestañas.
4. **Un destino, una URL canónica.** Las rutas viejas redirigen y conservan la consulta (`?comprobanteId`, `?casoId`, `?fuente=`).

---

## 3. Modelo propuesto

```
Menú lateral
└─ Inteligencia y control
   ├─ Operación del día   → /operacion            (ver decisión 2)
   ├─ Comercial           → /inteligencia/comercial
   ├─ Financiero          → /inteligencia/financiero
   ├─ Logístico           → /inteligencia/logistico
   └─ Calidad             → /inteligencia/calidad

Cada área: UNA fila de pestañas
   [ Tablero ] [ Registros ]

Registros: chips de filtro (no navegación)
   Comprobantes · Servicios realizados · Cobros · Costos      → ?fuente=cobros
```

Así, el peor caso pasa de **4 filas / 335 px a 1 fila / ~48 px**, y el menú sigue siendo la única lista de áreas.

---

## 4. Qué pasa con cada elemento actual

| Hoy | Después |
| --- | --- |
| Pestaña «Operación» | Sale del workspace: `/operacion`, en el grupo de operaciones (decisión 2) |
| Pestaña «Indicadores de negocio» | Desaparece: el área ya la elige el menú |
| Pestaña «Registros de origen» | Pasa a ser la segunda pestaña del área: **Registros** |
| Pestaña «Cobertura de los datos» | Deja de ser global. El sello de cobertura de cada tablero enlaza a `/inteligencia/cobertura` |
| Fila de fuentes (Comprobantes/Cobros/…) | Chips de filtro con `?fuente=` en la URL |
| Menú «Finanzas y rentabilidad → Registros financieros» | Apunta a la ruta canónica `/inteligencia/financiero/registros?fuente=comprobantes` |
| Menú «Compras… → Registros logísticos» | Ídem: `/inteligencia/logistico/registros` |
| `InteligenciaModule` y `FuentesGerencialesModule` | Quedan como un solo `AreaHeader` (título + una fila de pestañas) |

---

## 5. Rutas y redirecciones

| Ruta actual | Ruta canónica |
| --- | --- |
| `/inteligencia` | `/inteligencia/comercial` |
| `/inteligencia/comercial` | se mantiene (tablero) |
| `/inteligencia/origen/contratos` | `/inteligencia/comercial/registros?fuente=contratos` |
| `/inteligencia/origen/finanzas` | `/inteligencia/financiero/registros?fuente=comprobantes` |
| `/inteligencia/origen/finanzas?cobroId=9` | `/inteligencia/financiero/registros?fuente=cobros&cobroId=9` |
| `/inteligencia/origen/logistica` | `/inteligencia/logistico/registros?fuente=articulos` |
| `/inteligencia/origen/calidad` | `/inteligencia/calidad/registros?fuente=casos` |
| `/inteligencia/operacion/*` | `/operacion/*` |
| `/inteligencia/cobertura` | se mantiene, alcanzable desde el sello de cobertura |

La redirección se hace **antes** de migrar los enlaces: así los 30 enlaces viejos siguen funcionando mientras se cambian uno por uno.

---

## 6. Ejecución

**Paso 1 — el cascarón (una sesión).**
`shared/navigation.ts` y `App.tsx` para las rutas nuevas y la tabla de redirecciones; `InteligenciaWorkspace` se reduce a elegir área y renderizar `AreaHeader` + vista; `InteligenciaModule` y `FuentesGerencialesModule` se fusionan en `AreaHeader`; `FinanzasFuentesPage` y sus pares pasan a leer `?fuente=` en lugar de `useState`.

**Paso 2 — los enlaces (una sesión).**
Migrar los 30 enlaces de los 10 archivos, poner los chips de fuente con URL y el enlace de cobertura desde el sello. Actualizar las pruebas que afirman rutas viejas (`layout`, `h8.b3`, `FH06`, `FE07`, `InteligenciaWorkspace`).

**Esfuerzo:** dos sesiones. **Riesgo:** medio, y concentrado en los enlaces: mitigado porque los redirects existen desde el paso 1.

---

## 7. Verificación

- `tsc` api y web en 0; suite web completa (hoy 73 archivos / 452 pruebas) más pruebas nuevas de redirección y de `?fuente=`.
- **Medición del objetivo:** en cada ruta, contar las filas de pestañas antes del `h1` → debe ser **1**.
- `axe` en las ocho rutas: 0 violaciones (hoy ya está en 0; no debe romperse).
- Recarga y botón atrás con `?fuente=cobros` y con `?cobroId=9`.
- Los seis enlaces del menú y del tablero que apuntan a registros siguen llegando a la misma tabla.

---

## 8. Lo que no incluye

- Reorganizar el menú lateral completo (eso es la alternativa B, abajo).
- Tocar los tableros, sus métricas o el asistente.
- Cambiar la base de datos o la API: es navegación.

---

## 9. Decisiones que necesito

1. **¿«Finanzas y rentabilidad» y «Compras, inventario y logística» conservan su ítem de registros** apuntando a la ruta canónica, o el menú se queda sólo con «Inteligencia y control» y esos grupos pierden el ítem?
   *Recomendación:* conservarlos apuntando a la ruta canónica. Dos puertas al mismo destino no molestan; dos pantallas distintas para el mismo dato, sí.
2. **¿«Operación del día» se mueve al grupo de operaciones** (`/operacion`) o se queda colgando de Inteligencia?
   *Recomendación:* moverlo. Es operación, no indicador, y así Inteligencia queda con cuatro áreas y una sola fila.

---

## 10. Alternativa B (para después, no ahora)

Reorganizar el menú por **áreas de trabajo** en vez de por módulos: Comercial, Finanzas, Logística, Calidad y Operación, cada una con su tablero y sus registros, y «Inteligencia y control» desaparece como grupo. Es la estructura que el negocio ya usa para hablar, pero mueve el menú entero y toca todas las secciones, no sólo ésta. Recomiendo hacer el paso A primero: deja el ruteo canónico y los redirects listos, y la B se vuelve un cambio de etiquetas y grupos.
