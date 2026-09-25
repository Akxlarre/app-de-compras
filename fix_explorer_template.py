import os

filepath = 'src/app/features/explorer/explorer.page.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "<div class=\"w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm\"\n                   style=\"background: var(--bg-elevated); border: 1px solid var(--border-subtle);\">\n                {{ getEmoji(ex.muscle, ex.category) }}\n              </div>",
    "<div class=\"w-12 h-12 rounded-xl flex items-center justify-center shadow-sm\"\n                   style=\"background: var(--bg-elevated); border: 1px solid var(--border-subtle);\">\n                <app-icon [name]=\"getIconName(ex.muscle, ex.category)\" [size]=\"24\" style=\"color: var(--text-primary)\"></app-icon>\n              </div>"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
