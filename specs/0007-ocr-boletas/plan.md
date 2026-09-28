# Plan — 0007-ocr-boletas

## 1. Set de prueba (`supabase/functions/process-receipt/eval/`)
- `fotos/`: git-ignored (el repo es público). 11 boletas de internet (Líder, aCuenta, Jumbo/Cencosud,
  Unimarc, Tottus, almacén) juntadas el 2026-09-28. Las boletas reales de la familia se suman después.
- `casos/NN-*.json`: lo que realmente dice cada boleta (transcripción manual). Campos:
  `foto`, `store`, `date`, `total`, `items_count`, `lines[]` (`raw_text`, `kind`, `quantity`, `unit`,
  `unit_price`, `line_total`, `applies_to`, `legible`) y `notas`. Un valor marcado `"dudoso": true` no
  se evalúa línea por línea, pero cuenta para el total.
- Se commitean solo los JSON, nunca las fotos.

## 2. Línea base
- Script `eval/run.mjs`: para cada caso llama a la función (local o staging) con la foto y compara
  contra el JSON.
  - Métricas: líneas de producto bien (nombre ~, cantidad, total de línea), total de la boleta
    correcto y líneas ilegibles marcadas como tales (en vez de inventadas).
- Primero se confirma qué modelo de Gemini responde hoy (la función usa `gemini-1.5-*`).
- La línea base se toma con el prompt actual y el modelo vigente, y se registra en la spec.

## 3. Contrato nuevo de `process-receipt`
- Entrada: `images[]` (`{ base64, mimeType }`) y `expectedItems?: string[]`.
- Salida con el esquema de la spec, pedida con un esquema estricto (`response_schema`).
- Modelo principal y de respaldo configurables por variable de entorno.
- Prompt: los patrones observados en el set (ver notas de cada caso), la lista de contexto y la
  regla "ilegible, no inventar".

## 4. Validación en la app
- `core/utils/receipt.utils.ts`: `validateReceipt(r)` → `{ totalMatches, doubtfulLines[] }`, con
  tests primero.
- `ReceiptsRepository.extractItems` se adapta al contrato nuevo. La UI actual sigue funcionando
  (mapea `product` → `{name, price}`) hasta 0008.

## 5. Medir y cerrar
- Se corre el set con el contrato nuevo, se itera el prompt y se registra el resultado contra los
  umbrales del AC6.
