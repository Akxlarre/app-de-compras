import os
import re

emoji_pattern = re.compile(r'[\U00010000-\U0010ffff]', flags=re.UNICODE)

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.html') or file.endswith('.scss'):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    matches = emoji_pattern.finditer(content)
                    for match in matches:
                        print(f"{path}: {match.group(0)}")
            except Exception as e:
                pass
