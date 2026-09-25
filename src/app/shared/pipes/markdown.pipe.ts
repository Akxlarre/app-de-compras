import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'markdown',
  standalone: true,
})
export class MarkdownPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    if (!value) return '';

    let html = this.escapeHtml(value);

    // 1. Tablas Markdown (| col1 | col2 | ... |)
    html = this.parseTables(html);

    // 2. Encabezados (###, ##, #)
    html = html.replace(/^### (.*$)/gim, '<h4 class="text-xs font-semibold text-primary uppercase tracking-wider mt-3 mb-1">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 class="text-sm font-bold text-primary mt-3.5 mb-1.5 flex items-center gap-1.5">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 class="text-base font-bold text-primary mt-4 mb-2 pb-1 border-b border-border">$1</h2>');

    // 3. Negritas (**texto** o __texto__)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-primary">$1</strong>');
    html = html.replace(/__(.*?)__/g, '<strong class="font-semibold text-primary">$1</strong>');

    // 4. Cursivas (*texto* o _texto_)
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-secondary">$1</em>');
    html = html.replace(/_([^_]+)_/g, '<em class="italic text-secondary">$1</em>');

    // 5. Listas de viñetas (- item o * item)
    html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li class="ml-4 list-disc text-secondary text-xs leading-relaxed my-0.5">$1</li>');

    // 6. Código en línea (`código`)
    html = html.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-surface border border-border text-brand text-xs font-mono">$1</code>');

    // 7. Saltos de línea dobles y simples
    html = html.replace(/\n\n/g, '<div class="h-2"></div>');
    html = html.replace(/\n/g, '<br/>');

    // Limpieza de etiquetas erróneas producidas por mezclar listas/br
    html = html.replace(/(<\/li>)<br\/>/g, '$1');
    html = html.replace(/(<\/h[234]>)<br\/>/g, '$1');
    html = html.replace(/(<\/table>)<br\/>/g, '$1');

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private parseTables(text: string): string {
    const lines = text.split('\n');
    let inTable = false;
    let tableHtml = '';
    const processedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const isTableRow = line.startsWith('|') && line.endsWith('|');

      if (isTableRow) {
        // Ignorar fila separadora |---|---|
        if (/^\|[-:\s|]+\|$/.test(line)) {
          continue;
        }

        const cells = line
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim());

        if (!inTable) {
          inTable = true;
          tableHtml = '<div class="overflow-x-auto my-2 rounded-lg border border-border bg-surface"><table class="w-full text-xs text-left border-collapse"><thead><tr class="border-b border-border bg-base/60">';
          for (const cell of cells) {
            tableHtml += `<th class="py-1.5 px-2.5 font-semibold text-primary">${cell}</th>`;
          }
          tableHtml += '</tr></thead><tbody>';
        } else {
          tableHtml += '<tr class="border-b border-border/50 hover:bg-base/30 transition-colors">';
          for (const cell of cells) {
            tableHtml += `<td class="py-1.5 px-2.5 text-secondary">${cell}</td>`;
          }
          tableHtml += '</tr>';
        }
      } else {
        if (inTable) {
          tableHtml += '</tbody></table></div>';
          processedLines.push(tableHtml);
          tableHtml = '';
          inTable = false;
        }
        processedLines.push(lines[i]);
      }
    }

    if (inTable) {
      tableHtml += '</tbody></table></div>';
      processedLines.push(tableHtml);
    }

    return processedLines.join('\n');
  }
}
