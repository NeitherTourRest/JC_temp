with open(r'D:\JC\frontend\src\layouts\DefaultLayout.vue', 'r', encoding='utf-8') as f:
    c = f.read()

# Fix brand title
c = c.replace('JourneyCraft</h1>', 'JC</h1>')

# Fix unicode escapes
escapes = {
    '\\U0001f3de\\ufe0f': '\U0001f3de\ufe0f',
    '\\U0001f35c': '\U0001f35c',
    '\\U0001f4d3': '\U0001f4d3',
    '\\U0001f5fa\\ufe0f': '\U0001f5fa\ufe0f',
    '\\U0001f916': '\U0001f916',
    '\\U0001f4cb': '\U0001f4cb',
}
for esc, emoji in escapes.items():
    if esc in c:
        c = c.replace(esc, emoji)

# Fix sidebar width: 220px too narrow for icons, increase to 240px
c = c.replace('grid-template-columns: 220px 1fr', 'grid-template-columns: 240px 1fr')

# Fix brand-title overflow
old_brand = '.brand-title { font-size: 1.3rem; font-weight: 700; color: #000; cursor: pointer; letter-spacing: 1px; text-shadow: 2px 2px 0 var(--pop-pink); }'
new_brand = '.brand-title { font-size: 1.1rem; font-weight: 700; color: #000; cursor: pointer; letter-spacing: 1px; text-shadow: 2px 2px 0 var(--pop-pink); overflow: hidden; white-space: nowrap; }'
if old_brand in c:
    c = c.replace(old_brand, new_brand)

# Remove the text shadow from brand-title (too heavy with monospace font)
c = c.replace('text-shadow: 2px 2px 0 var(--pop-pink);', '')

with open(r'D:\JC\frontend\src\layouts\DefaultLayout.vue', 'w', encoding='utf-8') as f:
    f.write(c)
