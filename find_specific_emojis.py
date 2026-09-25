import os

emojis = ['?', '??', '?', '??', '??', '?', '??', '?', '???', '??', '??', '??', '??', '??', '??']

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.html') or file.endswith('.scss'):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    for em in emojis:
                        if em in content:
                            print(f"{path} contains {em}")
            except Exception as e:
                pass
