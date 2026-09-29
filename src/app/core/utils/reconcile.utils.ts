import type {
  CatalogProduct,
  MatchCandidate,
  OcrReceiptLine,
  ReceiptAlias,
  ReconcileListItem,
  ReconciledLine,
  ReconciliationResult,
} from '@core/models/receipt.model';

/** Coincidencia automática con un ítem de la lista (sin preguntar). */
const AUTO_MATCH = 0.6;
/** Por debajo de esto no se ofrece como candidato. */
const MIN_CANDIDATE = 0.4;
const MAX_CANDIDATES = 3;

/** Misma regla que `shop.normalize_receipt_text`: la clave de los alias. */
export function normalizeReceiptText(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toUpperCase();
}

function tokens(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);
}

const sameToken = (a: string, b: string) =>
  a === b || (a.length >= 3 && b.startsWith(a)) || (b.length >= 3 && a.startsWith(b));

/**
 * Parecido entre dos nombres (0..1): palabras en común (una abreviatura de 3+ letras cuenta como
 * prefijo: "GRAD" ≈ "grado"), sin tildes ni mayúsculas. Coeficiente de Dice sobre palabras.
 */
export function similarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = [...tokens(b)];
  if (!ta.length || !tb.length) return 0;
  let shared = 0;
  for (const t of ta) {
    const i = tb.findIndex((u) => sameToken(t, u));
    if (i >= 0) {
      shared++;
      tb.splice(i, 1);
    }
  }
  return (2 * shared) / (ta.length + tokens(b).length);
}

const lineScore = (line: OcrReceiptLine, name: string) =>
  Math.max(similarity(line.name ?? '', name), similarity(line.raw_text ?? '', name));

/**
 * Cruza las líneas de producto de la boleta con la compra (spec 0008), en orden:
 * 1. alias de la familia (el texto ya se confirmó antes) — gana siempre;
 * 2. el ítem de la lista que eligió el OCR (`matched_list_item`);
 * 3. el ítem de la lista más parecido, si es muy parecido;
 * 4. si no: candidatos de la lista o del catálogo ("¿Es este?"), o "no estaba en la lista".
 * Cada ítem de la lista se usa una vez; los marcados que sobran quedan en `missing`.
 */
export function reconcileReceipt(
  receiptLines: OcrReceiptLine[],
  checkedItems: ReconcileListItem[],
  catalog: CatalogProduct[],
  aliases: ReceiptAlias[]
): ReconciliationResult {
  const aliasMap = new Map(aliases.map((a) => [normalizeReceiptText(a.rawText), a.productId]));
  const catalogName = new Map(catalog.map((p) => [p.productId, p.name]));
  const used = new Set<string>();
  const free = () => checkedItems.filter((i) => !used.has(i.itemId));
  const fromItem = (i: ReconcileListItem, score: number): MatchCandidate => ({
    productId: i.productId,
    itemId: i.itemId,
    name: i.name,
    score,
  });

  const lines: ReconciledLine[] = [];
  receiptLines.forEach((line, index) => {
    if (line.kind !== 'product' || !line.legible) return;
    const base = { index, line, candidates: [] as MatchCandidate[] };

    // 1. Alias
    const aliasProduct = line.raw_text
      ? aliasMap.get(normalizeReceiptText(line.raw_text))
      : undefined;
    if (aliasProduct) {
      const it = free().find((i) => i.productId === aliasProduct);
      if (it) {
        used.add(it.itemId);
        lines.push({ ...base, status: 'matched', via: 'alias', match: fromItem(it, 1) });
      } else {
        const name = catalogName.get(aliasProduct) ?? line.name ?? line.raw_text ?? '';
        lines.push({
          ...base,
          status: 'extra',
          via: 'alias',
          match: { productId: aliasProduct, itemId: null, name, score: 1 },
        });
      }
      return;
    }

    // 2. El OCR ya lo cruzó con la lista
    if (line.matched_list_item) {
      const wanted = tokens(line.matched_list_item).join(' ');
      const it = free().find((i) => tokens(i.name).join(' ') === wanted);
      if (it) {
        used.add(it.itemId);
        lines.push({ ...base, status: 'matched', via: 'ocr', match: fromItem(it, 1) });
        return;
      }
    }

    // 3. Muy parecido a un ítem de la lista
    const scored = free()
      .map((i) => ({ i, score: lineScore(line, i.name) }))
      .sort((a, b) => b.score - a.score);
    if (scored[0] && scored[0].score >= AUTO_MATCH) {
      used.add(scored[0].i.itemId);
      lines.push({
        ...base,
        status: 'matched',
        via: 'similarity',
        match: fromItem(scored[0].i, scored[0].score),
      });
      return;
    }

    // 4. Candidatos (lista primero, después catálogo) o extra
    const inList = new Set(checkedItems.map((i) => i.productId));
    const candidates = [
      ...scored.filter((s) => s.score >= MIN_CANDIDATE).map((s) => fromItem(s.i, s.score)),
      ...catalog
        .filter((p) => !inList.has(p.productId))
        .map((p) => ({
          productId: p.productId,
          itemId: null,
          name: p.name,
          score: lineScore(line, p.name),
        }))
        .filter((c) => c.score >= MIN_CANDIDATE)
        .sort((a, b) => b.score - a.score),
    ].slice(0, MAX_CANDIDATES);

    lines.push({
      ...base,
      status: candidates.length ? 'candidate' : 'extra',
      via: null,
      match: null,
      candidates,
    });
  });

  return { lines, missing: free() };
}
