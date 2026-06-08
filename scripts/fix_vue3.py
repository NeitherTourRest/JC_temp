import re

with open(r'D:\JC\frontend\src\views\navigation\NavigationView.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all </template> positions
positions = [m.start() for m in re.finditer(r'</template>', content)]
print(f'All </template> positions: {positions}')
print(f'Total: {len(positions)}')

# Find <script tag
script_pos = content.find('<script')
print(f'<script at: {script_pos}')

# Find first <style
style_pos = content.find('<style')
print(f'<style at: {style_pos}')

# Find single </style>
style_end = content.find('</style>')
print(f'</style> at: {style_end}')

# The file should have:
# <template> ... </template> (actual template)
# <script> ... </script>
# <style> ... </style>

# The issue is there are 3 </template> because of v-if inside the template.
# The LAST </template> before <script is the actual template close.
valid_positions = [p for p in positions if p < script_pos]
if valid_positions:
    last_template_before_script = valid_positions[-1]
    print(f'Last </template> before script: {last_template_before_script}')
    
    # Check if there are more </template> after <script (which shouldn't exist)
    after_script = [p for p in positions if p > script_pos]
    if after_script:
        print(f'ERROR: </template> found after <script at {after_script}')
        print('Content around it:', repr(content[after_script[0]-30:after_script[0]+30]))
        
        # These are from a duplicate. We need to remove them.
        # Trim everything from the first bad </template> to <style
        cut_point = after_script[0]
        new_content = content[:cut_point] + content[style_pos:style_end+len('</style>')]
        
        print(f'Trimmed to {len(new_content)} chars')
        
        # Verify
        for tag in ['<template>', '</template>', '<script', '</script>', '<style', '</style>']:
            count = new_content.count(tag)
            print(f'  {tag}: {count}')
        
        with open(r'D:\JC\frontend\src\views\navigation\NavigationView.vue', 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('File written!')
    else:
        print('No duplicate </template> after script - file might be OK')
