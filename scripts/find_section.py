import re

with open(r'D:\JC\frontend\src\views\navigation\NavigationView.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the indoor-plan-wrap section
keyword = 'indoor-plan-wrap'
idx = content.find(keyword)
if idx < 0:
    print('Not found')
    exit()

# Find the opening <div
div_start = content.rfind('<div', 0, idx)
# Count nesting to find closing
depth = 0
end = div_start
for i in range(div_start, len(content)):
    if content[i:i+4] == '<div':
        depth += 1
    elif content[i:i+5] == '</div':
        depth -= 1
        if depth == 0:
            end = i + 6
            break

print('Section:', div_start, 'to', end)
print(content[div_start:end])
