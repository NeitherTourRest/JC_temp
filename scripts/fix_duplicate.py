import re

with open(r'D:\JC\frontend\src\views\navigation\NavigationView.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the second occurrence of the full template (starts after the second onIndoorSvgClick)
# Look for the duplicate injection point
first_script = content.find('<script setup lang="ts">')
if first_script >= 0:
    # Find where the SECOND script section starts (the duplicate)
    second_script = content.find('<script setup lang="ts">', first_script + 10)
    if second_script >= 0:
        # Find the first loadIndoorNodes function (the original one)
        first_load = content.find('async function loadIndoorNodes()')
        second_load = content.find('async function loadIndoorNodes()', first_load + 10)
        if second_load >= 0:
            # Keep everything up to the first loadIndoorNodes including the closing brace
            # Find the closing brace of the first loadIndoorNodes
            end_first = content.find('}', content.find('try', second_load - 100)) + 1
            # But wait, we want to keep the first version. Check which one is first
            if first_load < second_load:
                # Keep content up to the end of the first version
                # The first version ends before the second onIndoorSvgClick starts
                # Find the second onIndoorSvgClick
                first_fn = content.find('function onIndoorSvgClick')
                second_fn = content.find('function onIndoorSvgClick', first_fn + 10)
                if second_fn >= 0:
                    # Keep up to just before the second onIndoorSvgClick
                    # But go back a bit to find the clean boundary
                    boundary = content.rfind('\n', 0, second_fn)
                    new_content = content[:boundary] + '\n</style>\n'
                    with open(r'D:\JC\frontend\src\views\navigation\NavigationView.vue', 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f'Trimmed: {len(content)} -> {len(new_content)} chars')
                else:
                    print('Second onIndoorSvgClick not found')
            else:
                print('Incorrect order')
        else:
            print('Second loadIndoorNodes not found')
    else:
        print('Second script not found')
else:
    print('Script tag not found')
