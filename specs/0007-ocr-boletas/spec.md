> id: 0007-ocr-boletas
> refs: Auditoría de flujos (2026-09-25), punto 4 del plan: boletas/OCR. Conversación de diseño 2026-09-28.
> status: in-progress
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
- [ ] AC1: Staging confirma qué modelos responden hoy; la función usa uno vigente, configurable.
- [ ] AC2: La respuesta cumple el contrato con un esquema estricto; un test de la función rechaza una
  respuesta fuera del esquema.
- [ ] AC3: Acepta varias fotos y la lista de contexto.
- [x] AC4: `validateReceipt` con tests: línea que cuadra, línea que no, descuento aplicado, granel,
  total que no cuadra, línea ilegible.
- [ ] AC5: Set de prueba con ≥ 15 boletas de los comercios que usa la familia y un script de evaluación.
  Se registran la línea base y el resultado final.
- [ ] AC6: Resultado final en el set: ≥ 90 % de las líneas bien y ≥ 80 % de las boletas con total
  cuadrado. Umbrales a revisar con la línea base.
- [ ] AC7: El historial de git no contiene ninguna foto ni dato personal (RUT, tarjeta).

## Evidencia (2026-09-28, en curso)
- AC1 (parcial): staging (workflow `deploy-functions-staging.yml`) confirmó que 1.5 no existe y que 2.5
  "is no longer available to new users" (404); modelos configurables con `GEMINI_MODEL` /
  `GEMINI_FALLBACK_MODEL`. La familia 3.5 respondió 503 (high demand) en 9/11 boletas: se agregó un
  reintento por modelo y se pasó a `gemini-3.8-flash` con respaldo `gemini-3.5-flash`.
- AC4: `validateReceipt` (`1147b0e`), 22 tests: 10 casos puntuales + las 11 boletas transcritas
  (cuadran las 9 legibles; 04 y 09 marcan sus líneas ilegibles).
- Primeras lecturas con el prompt viejo: 04 (Jumbo ilegible) inventó 3 productos y un total de $8.110
  (real $19.711); 09 leyó 18/19 líneas pero no marcó las tapadas por el dedo.
