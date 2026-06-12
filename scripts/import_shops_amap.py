"""从高德 Web Service API 导入昌平区真实餐馆数据到 shops 表"""

import requests, time, math, pymysql

AMAP_KEY = '110ddf432672d1160770712e7f9d26d0'

CATEGORIES = [
    ("中餐", 30), ("火锅", 30), ("烧烤", 25), ("快餐", 25), ("小吃", 25),
    ("西餐", 20), ("日料", 20), ("咖啡厅", 20), ("川菜", 20), ("湘菜", 20),
    ("粤菜", 20), ("鲁菜", 20), ("面馆", 20), ("饺子", 20), ("韩餐", 20),
    ("奶茶", 20), ("面包甜点", 20),
]

def search_poi(keywords, city='昌平', page=1, offset=20):
    url = 'https://restapi.amap.com/v3/place/text'
    r = requests.get(url, params={
        'key': AMAP_KEY, 'keywords': keywords, 'city': city,
        'offset': offset, 'page': page, 'extensions': 'all',
    }, timeout=10)
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
    ret += (150.0*math.sin(x/30.0*PI) + 300.0*math.sin(x/30.0*PI)) * 2.0/3.0
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

def haversine(lat1, lng1, lat2, lng2):
    R = 6371000
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def extract_cuisine(atype, keyword):
    """从 Amap type 字段提取菜系"""
    if not atype:
        return keyword
    parts = atype.split(';')
    return parts[-1].strip() if parts[-1].strip() else keyword

# Connect to DB
conn = pymysql.connect(host='localhost', port=3306, user='root', password='root123',
                       database='journeycraft', charset='utf8mb4')
cur = conn.cursor()

# Get all spots for nearest-spot matching
cur.execute("SELECT id, latitude, longitude FROM spots")
spots = cur.fetchall()

def find_nearest_spot(lat, lng):
    best_id = None
    best_dist = float('inf')
    for sid, slat, slng in spots:
        d = haversine(lat, lng, slat, slng)
        if d < best_dist:
            best_dist = d
            best_id = sid
    return best_id if best_dist <= 5000 else None

# Clear old data
cur.execute("DELETE FROM food_reviews")
cur.execute("DELETE FROM foods")
cur.execute("DELETE FROM shops")
conn.commit()
print("Cleared old data")

# Fetch and insert
seen = set()
total = 0

for keyword, target in CATEGORIES:
    print(f"Searching '{keyword}' (target={target})...")
    pois = search_all(keyword, '昌平', target)
    for poi in pois:
        name = poi.get('name', '').strip()
        if not name or name.lower() in seen:
            continue
        seen.add(name.lower())

        loc = poi.get('location', '')
        if not loc or ',' not in loc:
            continue
        lng_gcj, lat_gcj = map(float, loc.split(','))
        lat_wgs, lng_wgs = gcj02_to_wgs84(lat_gcj, lng_gcj)

        address = poi.get('address', '') or ''
        atype = poi.get('type', '') or ''
        cuisine = extract_cuisine(atype, keyword)
        photos = poi.get('photos', [])
        img = photos[0].get('url', '') if photos else ''

        spot_id = find_nearest_spot(lat_wgs, lng_wgs)

        cur.execute(
            "INSERT INTO shops (name, address, description, latitude, longitude, cuisine, spot_id, image_url) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
            (name, address, f"{atype} | {address}", lat_wgs, lng_wgs, cuisine, spot_id, img)
        )
        total += 1

    conn.commit()
    print(f"  → {len(pois)} POIs, {total} unique so far")

conn.commit()
cur.close()
conn.close()
print(f"\nDone! Imported {total} unique shops")
