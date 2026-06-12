import pymysql

conn = pymysql.connect(host='localhost', port=3306, user='root', password='root123',
                       database='journeycraft', charset='utf8mb4')
cur = conn.cursor()

# Create shops table
cur.execute("""
    CREATE TABLE IF NOT EXISTS shops (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        address VARCHAR(500),
        description TEXT,
        latitude DOUBLE NOT NULL,
        longitude DOUBLE NOT NULL,
        cuisine VARCHAR(50),
        avg_rating DECIMAL(3,2) DEFAULT 0,
        rating_count INT DEFAULT 0,
        popularity INT DEFAULT 0,
        congestion_level VARCHAR(20) DEFAULT 'EMPTY',
        image_url VARCHAR(500),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
""")

# Add shop_id to foods if missing
try:
    cur.execute("ALTER TABLE foods ADD COLUMN shop_id BIGINT DEFAULT NULL")
except:
    pass  # already exists

conn.commit()
cur.close()
conn.close()
print('Tables ready')

# Now run the shops import
import requests, time, math

AMAP_KEY = '110ddf432672d1160770712e7f9d26d0'

def search_poi(keywords, city='昌平', page=1, offset=20):
    url = 'https://restapi.amap.com/v3/place/text'
    params = {'key': AMAP_KEY, 'keywords': keywords, 'city': city, 'offset': offset, 'page': page}
    r = requests.get(url, params=params, timeout=10)
    data = r.json()
    if data.get('status') != '1':
        return []
    return data.get('pois', [])

def search_all(keywords, city='昌平', max_results=50):
    all_pois = []
    page = 1
    while len(all_pois) < max_results:
        pois = search_poi(keywords, city, page, 20)
        if not pois:
            break
        all_pois.extend(pois)
        if len(pois) < 20:
            break
        page += 1
        time.sleep(0.3)
    return all_pois[:max_results]

PI = 3.141592653589793
A = 6378245.0
EE = 0.00669342162296594323

def transform_lat(x, y):
    ret = -100.0 + 2.0*x + 3.0*y + 0.2*y*y + 0.1*x*y + 0.2*math.sqrt(abs(x))
    ret += (20.0*math.sin(6.0*x*PI) + 20.0*math.sin(2.0*x*PI)) * 2.0/3.0
    ret += (20.0*math.sin(y*PI) + 40.0*math.sin(y/3.0*PI)) * 2.0/3.0
    ret += (160.0*math.sin(y/12.0*PI) + 320.0*math.sin(y*PI/30.0)) * 2.0/3.0
    return ret

def transform_lng(x, y):
    ret = 300.0 + x + 2.0*y + 0.1*x*x + 0.1*x*y + 0.1*math.sqrt(abs(x))
    ret += (20.0*math.sin(6.0*x*PI) + 20.0*math.sin(2.0*x*PI)) * 2.0/3.0
    ret += (20.0*math.sin(x*PI) + 40.0*math.sin(x/3.0*PI)) * 2.0/3.0
    ret += (150.0*math.sin(x/12.0*PI) + 300.0*math.sin(x/30.0*PI)) * 2.0/3.0
    return ret

def gcj02_to_wgs84(lat, lng):
    if lng < 72 or lng > 137 or lat < 0.8 or lat > 55:
        return lat, lng
    dlat = transform_lat(lng-105.0, lat-35.0)
    dlng = transform_lng(lng-105.0, lat-35.0)
    radlat = lat/180.0*PI
    magic = math.sin(radlat)
    magic = 1 - EE*magic*magic
    sqrtmagic = math.sqrt(magic)
    dlat = (dlat*180.0)/((A*(1-EE))/(magic*sqrtmagic)*PI)
    dlng = (dlng*180.0)/(A/sqrtmagic*math.cos(radlat)*PI)
    return lat-dlat, lng-dlng

def extract_location(poi):
    loc = poi.get('location', '')
    if loc and ',' in loc:
        lng, lat = map(float, loc.split(','))
        return gcj02_to_wgs84(lat, lng)
    return None, None

conn = pymysql.connect(host='localhost',port=3306,user='root',password='root123',database='journeycraft',charset='utf8mb4')
cur = conn.cursor()
cur.execute("DELETE FROM food_reviews")
cur.execute("DELETE FROM foods")
cur.execute("DELETE FROM shops")
conn.commit()

dishes_by_cuisine = {
    '川菜': ['宫保鸡丁','麻婆豆腐','水煮鱼','酸菜鱼','辣子鸡','毛血旺'],
    '湘菜': ['剁椒鱼头','小炒肉','辣椒炒肉','湘西腊肉','口味虾'],
    '粤菜': ['白切鸡','烧鹅','肠粉','煲仔饭','叉烧'],
    '鲁菜': ['糖醋鲤鱼','葱烧海参','九转大肠','爆炒腰花'],
    '日本料理': ['寿司拼盘','日式拉面','鳗鱼饭','天妇罗','刺身'],
    '韩国料理': ['韩式烤肉','石锅拌饭','泡菜炒饭','大酱汤','炒年糕'],
    '西餐': ['意式披萨','牛排','意大利面','沙拉','奶油蘑菇汤'],
    '西北菜': ['羊肉泡馍','大盘鸡','牛肉拉面','烤羊排'],
    '东北菜': ['锅包肉','地三鲜','猪肉炖粉条','酸菜白肉'],
}
default_dishes = ['招牌菜','特色菜','今日推荐']

print('Searching restaurants...')
all_pois = search_all('餐馆', '昌平', 100)
for extra in ['中餐','川菜','湘菜','粤菜','日本料理','韩国料理','西餐']:
    if len(all_pois) < 120:
        all_pois.extend(search_all(extra, '昌平', 15))

seen = set()
shop_count = 0
food_count = 0

for poi in all_pois:
    name = poi.get('name','').strip()
    if not name or name.lower() in seen:
        continue
    seen.add(name.lower())
    lat, lng = extract_location(poi)
    if lat is None:
        continue
    address = poi.get('address','') or ''
    typename = poi.get('type','') or ''
    cuisine = '中餐'
    for c in ['川菜','湘菜','粤菜','鲁菜','日本料理','韩国料理','西餐','西北菜','东北菜']:
        if c in typename:
            cuisine = c
            break
    photos = poi.get('photos',[])
    img = photos[0].get('url','') if photos else ''
    
    cur.execute("INSERT INTO shops (name,address,description,latitude,longitude,cuisine,image_url) VALUES (%s,%s,%s,%s,%s,%s,%s)",
               (name,address,typename,lat,lng,cuisine,img))
    shop_id = cur.lastrowid
    shop_count += 1
    
    dishes = dishes_by_cuisine.get(cuisine, default_dishes)
    for d in dishes[:4]:
        cur.execute("INSERT INTO foods (name,cuisine,shop_id,restaurant_name,latitude,longitude,popularity) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                   (d,cuisine,shop_id,name,lat,lng,50))
        food_count += 1
    
    if shop_count >= 60:
        break

conn.commit()
cur.close()
conn.close()
print('Shops: %d, Foods: %d' % (shop_count, food_count))
