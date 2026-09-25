import os

filepath = 'src/app/features/explorer/explorer.page.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "<span>{{ getEmoji(exercise.muscle, exercise.category) }}</span>",
    "<app-icon [name]=\"getIconName(exercise.muscle, exercise.category)\" [size]=\"24\"></app-icon>"
)
content = content.replace(
    "<span class=\"text-6xl z-10 filter drop-shadow-lg\">{{ getEmoji(exercise.muscle, exercise.category) }}</span>",
    "<app-icon [name]=\"getIconName(exercise.muscle, exercise.category)\" [size]=\"64\" class=\"z-10 filter drop-shadow-lg text-primary\"></app-icon>"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
