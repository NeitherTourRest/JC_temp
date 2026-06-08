with open(r'D:\JC\frontend\src\views\navigation\NavigationView.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# Count tags
for tag in ['<template>', '</template>', '<script', '</script>', '<style', '</style>']:
    count = content.count(tag)
    print(f'{tag}: {count}')

print(f'Length: {len(content)}')

# Find positions
templates = []
idx = -1
while True:
    idx = content.find('</template>', idx + 1)
    if idx < 0:
        break
    templates.append(idx)

print(f'</template> positions: {templates}')

style_start = content.find('<style')
style_end = content.find('</style>')
print(f'<style at: {style_start}')
print(f'</style> at: {style_end}')

# Check the last </template> that appears before <style
last_before_style = -1
for t in templates:
    if t < style_start:
        last_before_style = t

print(f'Last </template> before <style: {last_before_style}')
print(f'Content between: {repr(content[last_before_style+12:last_before_style+80])}')
