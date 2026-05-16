import os

file_path = r'e:\Apps.antigravity\private chat.app\app.js'
with open(file_path, 'rb') as f:
    data = f.read()

# Try to decode as UTF-8, if fails, just strip non-ascii to be safe
try:
    content = data.decode('utf-8')
except:
    content = data.decode('latin-1')

# Replace the known corruption patterns
content = content.replace('Ã¢Å“â€¦', '✅')
content = content.replace('Ã¢Â Å’', '❌')
content = content.replace('Ã¢Å“Â¨', '✨')
content = content.replace('â€”', '—')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Repair complete.")
