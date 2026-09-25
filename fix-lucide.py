import os

filepath = 'src/app/app.config.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "CheckCircle,",
    "CheckCircle,\n  Dumbbell,"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
