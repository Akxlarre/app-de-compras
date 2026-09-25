import os

filepath = 'src/app/features/workouts/workouts.page.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "<span class=\"kpi-icon\">???</span>",
    "<span class=\"kpi-icon\"><app-icon name=\"dumbbell\" [size]=\"16\"></app-icon></span>"
)
content = content.replace(
    "<span class=\"kpi-icon\">?</span>",
    "<span class=\"kpi-icon\"><app-icon name=\"zap\" [size]=\"16\"></app-icon></span>"
)
content = content.replace(
    "<span class=\"kpi-icon\">??</span>",
    "<span class=\"kpi-icon\"><app-icon name=\"clock\" [size]=\"16\"></app-icon></span>"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
