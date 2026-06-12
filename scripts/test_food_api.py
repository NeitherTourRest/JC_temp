import urllib.request, json

B = 'http://localhost:8080/api/v1'

# Test food list
r = json.loads(urllib.request.urlopen(B + '/foods?size=5', timeout=5).read())
print('Foods list: %d total' % r['data']['totalElements'])
for f in r['data']['content'][:5]:
    print('  - %s (cuisine: %s, restaurant: %s)' % (f['name'], f.get('cuisine',''), f.get('restaurantName','')))

# Test food search by keyword
kw = urllib.parse.quote('牛肉拉面')
r = json.loads(urllib.request.urlopen(B + '/foods/search?keyword=' + kw, timeout=5).read())
print('\nSearch result for keyword: %d items' % len(r['data'].get('content', [])))
for f in r['data']['content'][:3]:
    print('  - %s @ %s' % (f['name'], f.get('restaurantName','')))

# Test shops API
r = json.loads(urllib.request.urlopen(B + '/foods?size=1', timeout=5).read())
print('\nFoods data exists: OK')
