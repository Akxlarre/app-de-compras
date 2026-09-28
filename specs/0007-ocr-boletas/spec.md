> id: 0007-ocr-boletas
> refs: Auditoría de flujos (2026-09-25), punto 4 del plan: boletas/OCR. Conversación de diseño 2026-09-28.
> status: done
> created: 2026-09-28
> fotos: 11 boletas de internet en eval/fotos (git-ignored), 2026-09-28

## Problema
1. `process-receipt` usa `gemini-1.5-pro` con `gemini-1.5-flash` de respaldo. La familia 1.5 fue
   retirada por Google (a confirmar en staging): lo más probable es que hoy el OCR no responda.
2. Solo pide `{ name, price }`: pierde la cantidad, el precio por kilo, los descuentos, el total, la
   fecha y el local. Tampoco guarda el texto tal como aparece en la boleta.
3. `response_format: json_object`: el modelo puede omitir campos o inventar otros.
4. No se verifica nada. Si el modelo lee mal un número, pone uno plausible y nadie se entera.
5. Las boletas cambian mucho entre comercios. Antes se intentó con reglas y no escaló.

## Decisiones (conversación 2026-09-28)
- Seguimos con un LLM con visión (Gemini, el modelo vigente). No usamos plantillas por comercio: el
  prompt describe **patrones** que se repiten entre comercios y trae ejemplos.
- **No confiamos en la lectura, la verificamos con aritmética.** Las líneas que no cuadran se marcan
  para que el usuario revise solo esas.
- El prompt recibe **la lista de esa compra como contexto** (nombres de los ítems): el modelo elige
  entre ~20 productos en vez de adivinar.
- Esquema de respuesta estricto (`response_schema`), no `json_object`.
- La calidad se mide con un set de prueba y un script, no a ojo.

## Solución
### Contrato de respuesta (Edge Function `process-receipt`)
```
{
  store: string | null, date: 'YYYY-MM-DD' | null, total: number | null,
  lines: [{
    raw_text: string,             // tal cual aparece en la boleta
    kind: 'product' | 'discount' | 'bag' | 'deposit' | 'other',
    name: string | null,          // interpretación legible ("Leche entera 1L")
    matched_list_item: string | null, // nombre de la lista de contexto, si corresponde
    quantity: number | null, unit: 'un' | 'kg' | null,
    unit_price: number | null, line_total: number | null,
    applies_to: number | null,    // índice de la línea a la que aplica un descuento
    legible: boolean              // false: no se pudo leer bien (no inventar)
  }]
}
```
- Entrada: `imageBase64[]` (**varias fotos** para una boleta larga), `mimeType` y `expectedItems: string[]`.
- Modelo: el Gemini vigente con visión, más un respaldo, configurable por variable de entorno.
- El prompt describe con ejemplos:
  - la cantidad en una línea aparte (`3 X $990`);
  - los productos a granel (`0,845 KG X $2.990`);
  - los descuentos en línea aparte (`DCTO …`, `2x1`, precio socio);
  - bolsas, envases, redondeo y donaciones;
  - que las líneas ilegibles se marcan como tales y no se inventan.

### Validación (función pura en la app, `receipt.utils.ts`)
- `validateReceipt(r)` revisa dos cosas:
  - por línea: `quantity × unit_price ≈ line_total` (tolerancia por redondeo);
  - por boleta: `Σ line_total − Σ descuentos ≈ total`.
- Devuelve las líneas dudosas (no cuadran o no son legibles) y si el total cuadra.

### Set de prueba (`supabase/functions/process-receipt/eval/`)
- Por cada boleta: la foto (git-ignored, fuera del repo público) y un `expected.json` con las líneas.
- Script `eval` que corre la función contra el set y mide:
  - porcentaje de líneas leídas bien (nombre, cantidad y total de línea);
  - porcentaje de boletas cuyo total cuadra;
  - porcentaje de coincidencias con la lista de contexto.
- La línea base se toma antes de cambiar el prompt, y cada cambio de prompt se compara contra ella.

## Fuera de alcance
- La conciliación contra la compra y los alias: spec 0008.
- La UI de revisión, que se hace en 0008. Esta spec solo deja el contrato y la validación.

## Acceptance Criteria
- [x] AC1: Staging confirma qué modelos responden hoy; la función usa uno vigente, configurable.
- [x] AC2: La respuesta cumple el contrato con un esquema estricto; un test de la función rechaza una
  respuesta fuera del esquema.
- [x] AC3: Acepta varias fotos y la lista de contexto.
- [x] AC4: `validateReceipt` con tests: línea que cuadra, línea que no, descuento aplicado, granel,
  total que no cuadra, línea ilegible.
- [~] AC5 (diferido a producción): Set de prueba con ≥ 15 boletas de los comercios que usa la familia y un script de evaluación.
  Se registran la línea base y el resultado final.
- [x] AC6 (reformulado, ver cierre): Resultado final en el set: ≥ 90 % de las líneas bien y ≥ 80 % de las boletas con total
  cuadrado. Umbrales a revisar con la línea base.
- [x] AC7: El historial de git no contiene ninguna foto ni dato personal (RUT, tarjeta).

## Evidencia (2026-09-28, en curso)
- AC1 (parcial): staging (workflow `deploy-functions-staging.yml`) confirmó que 1.5 no existe y que 2.5
  "is no longer available to new users" (404); modelos configurables con `GEMINI_MODEL` /
  `GEMINI_FALLBACK_MODEL`. La familia 3.5 respondió 503 (high demand) en 9/11 boletas: se agregó un
  reintento por modelo y se pasó a `gemini-3.8-flash` con respaldo `gemini-3.5-flash`.
- AC4: `validateReceipt` (`1147b0e`), 22 tests: 10 casos puntuales + las 11 boletas transcritas
  (cuadran las 9 legibles; 04 y 09 marcan sus líneas ilegibles).
- Primeras lecturas con el prompt viejo: 04 (Jumbo ilegible) inventó 3 productos y un total de $8.110
  (real $19.711); 09 leyó 18/19 líneas pero no marcó las tapadas por el dedo.
- **Línea base** (prompt viejo `{name, price}`, cadena de modelos del plan gratuito, 11 boletas,
  2026-09-28): líneas bien 70/84 (83 %, generoso: un solo "price" a veces coincide con el total de
  línea), **totales ok 3/11 (27 %)**, 0 errores. Pierde cantidades (02: "2X 640" → $640), no resta
  descuentos (06: $6.380 vs $2.552; 05: $32.869 vs $29.770), 04 inventa 3 productos, 09 no marca las
  líneas tapadas. Modelos que respondieron: 3.6-flash, 3.1-flash-lite, 3.5-flash-lite.
- **Contrato nuevo, prompt v1** (`dda3ec6`): líneas bien 82/84 (98 %), total impreso bien leído 11/11,
  **las líneas suman el total en 7/11**. Las 4 que no cuadran quedan marcadas por la aritmética, no
  pasan como buenas: 03 (±$10, el "LAV LIMON" ambiguo de la foto), 04 (leyó 2 fragmentos, no inventó
  productos completos), 09 (faltan $1.000 bajo el dedo) y 01 (tomó "x 0.245 KG" como producto y corrió
  los montos). Prompt v2 (`4adba0e`) corrige lo de 01 y pide marcar ilegibles en vez de reconstruir.
- AC7: `git log --all` no tiene imágenes bajo `eval/` (fotos y resultados git-ignored); los casos no
  tienen RUT ni tarjetas; se quitó el usuario de TikTok del origen del caso 01.
- Prompt v2 (`4adba0e`, "suma antes de responder"): la 04 ilegible devolvió "14 X $660 = $9.241" (14×660
  = 9.240): **ajustó un monto en $1 para llegar al total**, dentro de la tolerancia de validateReceipt.
  Se descartó: pedirle al modelo que verifique la suma lo empuja a forzarla.
- **Prompt v3** (`6a3c5da`, "copia los montos tal cual"): líneas bien 72/75 (96 %), total impreso 10/10,
  las líneas suman el total en 6/8 legibles (+ la 08 cuadró en v1/v2; en v3 dio 429), **0 boletas con
  líneas ilegibles que cuadren** (sin lecturas inventadas que pasen como buenas). No cuadran y quedan
  marcadas: 01 (el modelo lite sigue corriendo los montos del granel), 03 (±$10, ambigua en la foto).
  Casi todo lo leyó `gemini-3.1-flash-lite`: los modelos mejores ya no tenían cuota. La 08 falló con 429
  en toda la cadena: la cuota diaria gratuita se agota en ~5 corridas del set.
- AC1: cadena de 7 modelos vigentes (`GEMINI_MODELS`), confirmada en staging. AC2: esquema estricto
  (`json_schema`) + `parseOcrReceipt` rechaza respuestas fuera de contrato (tests). AC3: `images[]`
  (hasta 5) y `expectedItems` en la función y en `ReceiptsRepository.extractReceipt` (tests).
- Pendiente: AC5 (hay 11 boletas de internet; faltan ≥4 de la familia) y AC6 (líneas ✓ 96 %; boletas
  que cuadran 6–7 de 8–9 legibles, bajo el 80 %; umbral a revisar con el usuario).

## Cierre (2026-09-28, decisión del usuario)
La app sale a producción con el prompt v3 para la primera compra; la medición sigue con boletas reales.
- **AC6 reformulado:** se mide lo que protege al usuario: ≥ 90 % de líneas bien leídas (96–98 %) y
  **0 boletas con líneas ilegibles que cuadren** (lecturas inventadas que pasarían como buenas): ambos
  cumplidos. "Las líneas suman el total" queda en 75–78 % de las legibles; lo que no cuadra lo marca
  `validateReceipt` y lo revisa la persona (pantalla de conciliación, spec 0008).
- **AC5 diferido:** el set tiene 11 boletas de internet. Las de la familia se suman en sesiones futuras,
  desde la app en producción (el usuario reporta los problemas o la app los registra, ver 0008).
- Riesgo conocido: en el plan gratuito de Gemini la cuota diaria se agota en ~5 corridas del set (~55
  lecturas) y los modelos se saturan en horas punta; la cadena de modelos lo amortigua pero una lectura
  puede fallar con 429/503. El usuario eligió seguir en el plan gratuito.
