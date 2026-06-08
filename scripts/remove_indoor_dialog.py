import re

with open(r'D:\JC\frontend\src\views\navigation\NavigationView.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the indoor dialog section and comment it out for testing
start = content.find('<!-- 室内导航弹窗 -->')
end = content.find('</DefaultLayout>', start)
if start >= 0:
    indoor_section = content[start:end]
    # Replace the indoor section with a placeholder
    new_section = '<!-- indoor dialog removed for build test -->\n'
    content = content[:start] + new_section + content[end:]
    with open(r'D:\JC\frontend\src\views\navigation\NavigationView.vue', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Replaced indoor section, new file written')
else:
    print('Indoor section not found')
