with open(r'D:\JC\frontend\src\views\navigation\NavigationView.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# First template close at 11598
first_template_end = content.find('</template>') + len('</template>')
print(f'First template end: {first_template_end}')

# Style section
style_start = content.find('<style')
style_end = content.find('</style>') + len('</style>')

# Content between first template end and style start
between = content[first_template_end:style_start]
print(f'Between length: {len(between)}')
print(f'First 200 chars: {repr(between[:200])}')

# Find where the actual script content that we need is
# It should have the imports, refs, functions etc.
script_markers = ['import {', 'const map', 'const mapContainer', 'const pickingStart', '// --- Indoor']
for marker in script_markers:
    pos = between.find(marker)
    if pos >= 0:
        print(f'Found "{marker}" at position {pos} in "between"')
    
# Check for duplicate template tag
dup_template = between.count('<template>')
dup_script = between.count('<script')
print(f'Duplicates: <template>={dup_template}, <script>={dup_script}')

# Strategy: take the file content up to first </template>,
# then add </script>, 
# then add the style section
# But we need the script content too!
# Let me find the actual script content
# The FIRST <script tag after the first </template>
script_tag_pos = between.find('<script')
if script_tag_pos >= 0:
    print(f'Found duplicate script tag at {script_tag_pos} in between')
    # Everything after this script tag up to <style is the actual script content
    actual_script = between[script_tag_pos:]
    # Remove the <script...> tag
    script_content_start = actual_script.find('>') + 1
    script_content = actual_script[script_content_start:].strip()
    print(f'Script content length: {len(script_content)}')
    print(f'First 100 chars: {repr(script_content[:100])}')
    
    # Now reconstruct
    new_content = content[:first_template_end] + '\n' + script_content + '\n' + '</script>' + '\n\n' + content[style_start:style_end]
    
    print(f'New file length: {len(new_content)}')
    
    # Verify
    for tag in ['<template>', '</template>', '<script', '</script>', '<style', '</style>']:
        count = new_content.count(tag)
        print(f'  {tag}: {count}')
    
    with open(r'D:\JC\frontend\src\views\navigation\NavigationView.vue', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('File written!')
