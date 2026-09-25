import os

filepath = 'src/app/features/auth/login/login.component.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "<span class=\"text-2xl\">???</span>",
    "<app-icon name=\"dumbbell\" [size]=\"28\" class=\"text-blue-500\"></app-icon>"
)
content = content.replace(
    "imports: [\n    ReactiveFormsModule,\n    IonSpinner,\n    IonIcon,\n    NgClass\n  ],",
    "imports: [\n    ReactiveFormsModule,\n    IonSpinner,\n    IonIcon,\n    NgClass,\n    IconComponent\n  ],"
)
content = content.replace(
    "import { logInOutline, personAddOutline, lockClosedOutline, mailOutline, warningOutline } from 'ionicons/icons';",
    "import { logInOutline, personAddOutline, lockClosedOutline, mailOutline, warningOutline } from 'ionicons/icons';\nimport { IconComponent } from '@shared/components/icon/icon.component';"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
