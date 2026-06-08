with open(r'D:\JC\frontend\src\views\navigation\NavigationView.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace el-dialog with a placeholder div
import re
start = content.find('<el-dialog')
end = content.find('</el-dialog>', start)
if start >= 0 and end >= 0:
    end += len('</el-dialog>')
    placeholder = '<div id="indoor-placeholder" style="display:none"></div>'
    content = content[:start] + placeholder + content[end:]
    with open(r'D:\JC\frontend\src\views\navigation\NavigationView.vue', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Replaced el-dialog with placeholder')
else:
    print('el-dialog not found')
