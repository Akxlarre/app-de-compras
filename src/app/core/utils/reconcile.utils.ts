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

/**
 * `r` es de la boleta y `n` del producto. La boleta abrevia ("GRAD" ≈ "grado"); al revés se exigen
 * 4+ letras para que "Sal" no calce con "SALSA" ni "Pan" con "PANCHO".
 */
const sameToken = (r: string, n: string) =>
  r === n || (r.length >= 3 && n.startsWith(r)) || (n.length >= 4 && r.startsWith(n));

/**
 * Parecido entre un texto de boleta `a` y un nombre de producto `b` (0..1): palabras en común (ver
 * `sameToken`), sin tildes ni mayúsculas. Coeficiente de Dice sobre palabras.
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

/** Todas las palabras del nombre (alguna de 3+ letras) están enteras en el texto: "Arroz" ⊂ "ARROZ G1 GRANO". */
function contains(text: string, name: string): boolean {
  const tn = tokens(name);
  const tt = new Set(tokens(text));
  return tn.some((t) => t.length >= 3) && tn.every((t) => tt.has(t));
}

/** Un nombre contenido en la línea llega a candidato, nunca a coincidencia automática. */
const lineScore = (line: OcrReceiptLine, name: string) => {
  const score = Math.max(similarity(line.name ?? '', name), similarity(line.raw_text ?? '', name));
  const inLine = contains(line.name ?? '', name) || contains(line.raw_text ?? '', name);
  return inLine ? Math.max(score, MIN_CANDIDATE) : score;
};

/**
 * Cruza las líneas de producto de la boleta con la compra (spec 0008), en orden:
 * 0. la misma línea repetida va al ítem con que ya coincidió la primera;
 * 1. alias de la familia (el texto ya se confirmó antes) — gana siempre;
 * 2. el ítem de la lista que eligió el OCR (`matched_list_item`);
 * 3. el ítem de la lista más parecido, si es muy parecido;
 * 4. si no: candidatos de la lista o del catálogo ("¿Es este?"), o "no estaba en la lista".
 * Se cruza con lo marcado y con lo pendiente (spec 0015); en un empate gana lo marcado. Cada ítem
 * de la lista se usa una vez; los marcados que sobran quedan en `missing`.
 */
export function reconcileReceipt(
  receiptLines: OcrReceiptLine[],
  checkedItems: ReconcileListItem[],
  catalog: CatalogProduct[],
  aliases: ReceiptAlias[],
  pendingItems: ReconcileListItem[] = []
): ReconciliationResult {
  const aliasMap = new Map(aliases.map((a) => [normalizeReceiptText(a.rawText), a.productId]));
  const catalogName = new Map(catalog.map((p) => [p.productId, p.name]));
  const listItems = [...checkedItems, ...pendingItems];
  const pendingIds = new Set(pendingItems.map((i) => i.itemId));
  const used = new Set<string>();
  const free = () => listItems.filter((i) => !used.has(i.itemId));
  const fromItem = (i: ReconcileListItem, score: number): MatchCandidate => ({
    productId: i.productId,
    itemId: i.itemId,
    name: i.name,
    score,
    ...(pendingIds.has(i.itemId) ? { wasPending: true } : {}),
  });
  const firstByText = new Map<string, ReconciledLine>();

  const lines: ReconciledLine[] = [];
  receiptLines.forEach((line, index) => {
    if (line.kind !== 'product' || !line.legible) return;
    const base = { index, line, candidates: [] as MatchCandidate[] };
    const text = normalizeReceiptText(line.raw_text ?? line.name ?? '');
    const push = (r: ReconciledLine) => {
      lines.push(r);
      if (text && !firstByText.has(text)) firstByText.set(text, r);
    };

    // 0. Repetida
    const first = text ? firstByText.get(text) : undefined;
    if (first?.status === 'matched' && first.match?.itemId) {
      lines.push({ ...base, status: 'matched', via: first.via, match: first.match });
      return;
    }

    // 1. Alias
    const aliasProduct = line.raw_text
      ? aliasMap.get(normalizeReceiptText(line.raw_text))
      : undefined;
    if (aliasProduct) {
      const it = free().find((i) => i.productId === aliasProduct);
      if (it) {
        used.add(it.itemId);
        push({ ...base, status: 'matched', via: 'alias', match: fromItem(it, 1) });
      } else {
        const name = catalogName.get(aliasProduct) ?? line.name ?? line.raw_text ?? '';
        push({
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
        push({ ...base, status: 'matched', via: 'ocr', match: fromItem(it, 1) });
        return;
      }
    }

    // 3. Muy parecido a un ítem de la lista
    const scored = free()
      .map((i) => ({ i, score: lineScore(line, i.name) }))
      .sort((a, b) => b.score - a.score);
    if (scored[0] && scored[0].score >= AUTO_MATCH) {
      used.add(scored[0].i.itemId);
      push({
        ...base,
        status: 'matched',
        via: 'similarity',
        match: fromItem(scored[0].i, scored[0].score),
      });
      return;
    }

    // 4. Candidatos (lista primero, después catálogo) o extra
    const inList = new Set(listItems.map((i) => i.productId));
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

    push({
      ...base,
      status: candidates.length ? 'candidate' : 'extra',
      via: null,
      match: null,
      candidates,
    });
  });

  return { lines, missing: checkedItems.filter((i) => !used.has(i.itemId)) };
}
