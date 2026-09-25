import os

filepath = 'src/app/shared/components/app-header/app-header.component.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "            <div class=\"streak-pill\">\n              <span class=\"streak-fire\"><app-icon name=\"zap\" [size]=\"14\"></app-icon></span>\n              <span class=\"streak-text\">Activo</span>\n          <ng-content select=\"[slot=actions]\"></ng-content>\n        </div>\n      </div>\n      <ng-content select=\"[slot=bottom]\"></ng-content>",
    "            <div class=\"streak-pill\">\n              <span class=\"streak-fire\"><app-icon name=\"zap\" [size]=\"14\"></app-icon></span>\n              <span class=\"streak-text\">Activo</span>\n            </div>\n          }\n          <ng-content select=\"[slot=actions]\"></ng-content>\n        </div>\n      </div>\n      <ng-content select=\"[slot=bottom]\"></ng-content>"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
