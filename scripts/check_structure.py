with open(r'D:\JC\frontend\src\views\navigation\NavigationView.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# Find template openings and closings
template_open = content.count('<template>')
template_close = content.count('</template>')
print(f'<template>: {template_open}, </template>: {template_close}')

# Find dialog closing and template closing positions
for tag in ['</el-dialog>', '</DefaultLayout>', '</template>', '</script>', '</style>']:
    pos = content.find(tag)
    if pos >= 0:
        print(f'{tag}: {pos} (line {content[:pos].count(chr(10)) + 1})')
    else:
        print(f'{tag}: NOT FOUND')

# Check if there are extra < or > characters
import re
unusual = re.findall(r'[<>]', content[content.find('</template>'):content.find('<script')])
print(f'\nExtra angle brackets between template and script: {len(unusual)}')
