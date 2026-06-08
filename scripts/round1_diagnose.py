import os

views = {
    'home': r'D:\JC\frontend\src\views\home\HomeView.vue',
    'spots': r'D:\JC\frontend\src\views\spot\SpotListView.vue',
    'diary_edit': r'D:\JC\frontend\src\views\diary\DiaryEditorView.vue',
    'diary_list': r'D:\JC\frontend\src\views\diary\DiaryListView.vue',
    'nav': r'D:\JC\frontend\src\views\navigation\NavigationView.vue',
    'foods': r'D:\JC\frontend\src\views\food\FoodSearchView.vue',
    'ai_chat': r'D:\JC\frontend\src\views\ai\AIChatView.vue',
    'trips': r'D:\JC\frontend\src\views\itinerary\ItineraryListView.vue',
}

print('=== Round 1 Issue Scan ===')
for name, path in views.items():
    if not os.path.exists(path):
        print(f'{name}: MISSING')
        continue
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()
    
    # Check for issues
    issues = []
    if 'catch {}' in c or 'catch{}' in c:
        issues.append('empty catch')
    if 'as any' in c:
        issues.append('as any')
    if 'console.log' in c:
        issues.append('console.log')
    if c.count('</div>') == 0 and c.count('</') < 5:
        issues.append('malformed')
    
    # Specific checks
    if name == 'foods':
        if 'fetch' in c and 'loading' in c:
            pass  # OK
        if c.count('import ') < 3:
            issues.append('minimal imports')
    
    if name == 'diary_edit':
        if 'el-upload' in c:
            issues.append('still uses el-upload')
    
    status = ', '.join(issues) if issues else 'clean'
    print(f'{name}: {status} ({len(c)} chars)')
