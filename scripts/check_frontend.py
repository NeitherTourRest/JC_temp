with open(r'D:\JC\frontend\src\views\indoor\IndoorNavigationView.vue', 'r', encoding='utf-8') as f:
    content = f.read()

checks = {
    'Template with floor switcher': 'floor-switcher' in content,
    'Floor plan image': 'floor-plan' in content,
    'SVG path overlay': 'path-overlay' in content,
    'Node markers': 'node-marker' in content,
    'Start/end select buttons': 'toggleSelect' in content,
    'Navigate button': '\u5f00\u59cb\u5bfc\u822a' in content,
    'Navigation result steps': 'step-list' in content,
    'Cross-floor indicator': 'cross-floor' in content,
    'Script setup': '<script setup' in content,
    'onMounted': 'onMounted' in content,
    'loadNodes': 'loadNodes' in content,
    'getNodesByFloor': 'getNodesByFloor' in content,
    'API call navigate': 'indoorApi.navigate' in content,
    'API call getBuilding': 'indoorApi.getBuilding' in content,
    'building ID': 'BUPT_ZHONGHE_ZONGHE' in content,
    'floor plan URL fallback': '/images/indoor/BUPT_ZHONGHE_ZONGHE/' in content,
}

all_pass = True
for name, result in checks.items():
    status = 'OK' if result else 'MISSING'
    if not result:
        all_pass = False
    print(f'  [{status}] {name}')

print()
print('ALL CHECKS PASS' if all_pass else 'SOME CHECKS FAILED')
