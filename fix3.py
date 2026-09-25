import os

filepath = 'src/app/features/explorer/exercise-selector/exercise-selector.component.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace getEmoji function
content = content.replace(
    "getEmoji(muscle: string, category: string): string {\n    const m = (muscle || '').toLowerCase();\n    const c = (category || '').toLowerCase();\n    if (m.includes('pecho') || m.includes('chest')) return '???';\n    if (m.includes('espalda') || m.includes('back')) return '??';\n    if (m.includes('pierna') || m.includes('cuádriceps') || m.includes('quad') || m.includes('isquio') || m.includes('femoral') || m.includes('hamstring') || m.includes('pantorrilla') || m.includes('calves')) return '??';\n    if (m.includes('hombro') || m.includes('shoulder') || m.includes('deltoid')) return '???';\n    if (m.includes('bíceps') || m.includes('bicep')) return '??';\n    if (m.includes('tríceps') || m.includes('tricep')) return '??';\n    if (m.includes('abdom') || m.includes('core')) return '??';\n    if (m.includes('glúteo') || m.includes('glute')) return '??';\n    if (c.includes('cardio')) return '??';\n    return '???';\n  }",
    "getIconName(muscle: string, category: string): string {\n    const m = (muscle || '').toLowerCase();\n    const c = (category || '').toLowerCase();\n    if (m.includes('pecho') || m.includes('chest')) return 'shield-check';\n    if (m.includes('espalda') || m.includes('back')) return 'layers';\n    if (m.includes('pierna') || m.includes('cuádriceps') || m.includes('quad') || m.includes('isquio') || m.includes('femoral') || m.includes('hamstring') || m.includes('pantorrilla') || m.includes('calves')) return 'activity';\n    if (m.includes('hombro') || m.includes('shoulder') || m.includes('deltoid')) return 'dumbbell';\n    if (m.includes('bíceps') || m.includes('bicep')) return 'activity';\n    if (m.includes('tríceps') || m.includes('tricep')) return 'activity';\n    if (m.includes('abdom') || m.includes('core')) return 'circle';\n    if (m.includes('glúteo') || m.includes('glute')) return 'circle';\n    if (c.includes('cardio')) return 'activity';\n    return 'dumbbell';\n  }"
)

# Replace template usages of getEmoji
content = content.replace(
    "<span>{{ getEmoji(exercise.muscle, exercise.category) }}</span>",
    "<app-icon [name]=\"getIconName(exercise.muscle, exercise.category)\" [size]=\"24\"></app-icon>"
)
content = content.replace(
    "<span class=\"text-6xl z-10 filter drop-shadow-lg\">{{ getEmoji(exercise.muscle, exercise.category) }}</span>",
    "<app-icon [name]=\"getIconName(exercise.muscle, exercise.category)\" [size]=\"64\" class=\"z-10 filter drop-shadow-lg text-primary\"></app-icon>"
)

# Replace FILTERS array
content = content.replace("emoji: '?'", "icon: 'zap'")
content = content.replace("emoji: '???'", "icon: 'shield-check'")
content = content.replace("emoji: '??'", "icon: 'layers'")
content = content.replace("emoji: '??'", "icon: 'activity'")
content = content.replace("emoji: '???'", "icon: 'dumbbell'")
content = content.replace("emoji: '??'", "icon: 'activity'")
content = content.replace("emoji: '??'", "icon: 'activity'")
content = content.replace("emoji: '??'", "icon: 'target'")

# Replace FILTERS template usage
content = content.replace(
    "<span class=\"text-lg group-hover:scale-110 transition-transform duration-200\">{{ filter.emoji }}</span>",
    "<app-icon [name]=\"filter.icon\" [size]=\"18\" class=\"group-hover:scale-110 transition-transform duration-200\"></app-icon>"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
