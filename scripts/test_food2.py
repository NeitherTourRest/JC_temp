import pymysql, urllib.request, json

c = pymysql.connect(host='localhost',port=3306,user='root',password='root123',database='journeycraft',charset='utf8mb4').cursor()
c.execute("SELECT cuisine, COUNT(*) FROM shops GROUP BY cuisine")
for r in c.fetchall():
    print('Cuisine: %s -> %d shops' % (r[0], r[1]))

c.execute("SELECT name, restaurant_name FROM foods WHERE name LIKE '%拉面%' OR restaurant_name LIKE '%拉面%'")
r = c.fetchall()
print('\nFoods matching 拉面: %d' % len(r))
for row in r[:5]:
    print('  %s @ %s' % (row[0], row[1]))

# Test the API with a simpler keyword
import urllib.request
B = 'http://localhost:8080/api/v1'
kw = urllib.parse.quote('宫保鸡丁')
d = json.loads(urllib.request.urlopen(B + '/foods/search?keyword=' + kw, timeout=5).read())
print('\nSearch 宫保鸡丁: %d results' % len(d['data'].get('content',[])))
for f in d['data']['content'][:3]:
    print('  %s @ %s' % (f['name'], f.get('restaurantName','')))
