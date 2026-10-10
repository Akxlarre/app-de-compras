import type { PopulatedListItem } from '../models/shopping-list.model';
import { groupByAisle } from './aisles.utils';
import { formatQuantity } from './units.utils';

/** "× 3" para unidades; "1,5 kg" con la unidad; nada si es 1 un. */
function quantityText(item: PopulatedListItem): string {
  const unit = item.unit ?? 'un';
  const quantity = Number(item.quantity) || 1;
  if (unit === 'un') return quantity === 1 ? '' : ` × ${formatQuantity(quantity, unit)}`;
  return ` ${formatQuantity(quantity, unit)}`;
}

/**
 * Los pendientes como texto para WhatsApp (spec 0024 D2): por pasillo, en negrita y cursiva de
 * WhatsApp. null si no queda nada pendiente.
 */
export function pendingListText(items: readonly PopulatedListItem[]): string | null {
  const groups = groupByAisle(items.filter((i) => !i.is_checked));
  if (groups.length === 0) return null;
  const lines = ['*Lista de compras*'];
  for (const g of groups) {
    lines.push(`_${g.aisle}_`);
    for (const i of g.items) {
      const note = i.notes ? ` (${i.notes})` : '';
      lines.push(`• ${i.product?.name ?? 'Producto'}${quantityText(i)}${note}`);
    }
  }
  return lines.join('\n');
}
