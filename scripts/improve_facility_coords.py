# -*- coding: utf-8 -*-
"""
使用高德周边搜索 (around) 为每个景点查找真实设施 POI，更新 facilities 表。
对于没有真实 POI 匹配的设施，保持现有合成坐标不变。
"""
import requests, pymysql, time, math, sys

AMAP_KEY = '110ddf432672d1160770712e7f9d26d0'
DB = {"host":"localhost","port":3306,"user":"root","password":"root123","database":"journeycraft","charset":"utf8mb4"}

# 设施分类 → 高德搜索关键字
CATEGORY_KEYWORDS = {
    'TOILET': '卫生间',
    'PARKING': '停车场',
    'TICKET': '售票处',
    'SERVICE': '游客服务中心',
    'CAFE': '咖啡厅',
    'SUPERMARKET': '超市',
    'HOSPITAL': '医院',
    'LIBRARY': '图书馆',
    'GYM': '体育场',
}

def search_around(lat, lng, keyword, radius=500):
    """高德周边搜索"""
    url = 'https://restapi.amap.com/v3/place/around'
    params = {
        'key': AMAP_KEY,
        'location': '%f,%f' % (lng, lat),
        'keywords': keyword,
        'radius': radius,
        'offset': 10,
        'page': 1,
    }
    try:
        r = requests.get(url, params=params, timeout=10)
        data = r.json()
        if data.get('status') == '1':
            return data.get('pois', [])
    except:
        pass
    return []

def extract_location(poi):
    loc = poi.get('location', '')
    if loc and ',' in loc:
        parts = loc.split(',')
        return float(parts[1]), float(parts[0])
    return None, None

def gcj02_to_wgs84(lat, lng):
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

conn = pymysql.connect(**DB)
cur = conn.cursor()

# Get all spots with their WGS-84 coords
cur.execute("SELECT id, name, latitude, longitude FROM spots")
spots = cur.fetchall()
print('Spots: %d' % len(spots))

updated = 0
searched = 0

for spot_id, spot_name, lat, lng in spots:
    # For each facility category that has Amap keyword mapping
    for category, keyword in CATEGORY_KEYWORDS.items():
        # Search around spot for this facility type
        pois = search_around(lat, lng, keyword, 500)
        searched += 1
        if not pois:
            continue
        # Get the first matching POI
        poi = pois[0]
        amap_lat, amap_lng = extract_location(poi)
        if amap_lat is None:
            continue
        
        # Convert GCJ-02 to WGS-84 for DB storage
        wgs_lat, wgs_lng = gcj02_to_wgs84(amap_lat, amap_lng)
        poi_name = poi.get('name', keyword)
        
        # Update facilities of this category for this spot
        cur.execute(
            "UPDATE facilities SET latitude=%s, longitude=%s, name=%s WHERE spot_id=%s AND category=%s LIMIT 1",
            (wgs_lat, wgs_lng, poi_name, spot_id, category)
        )
        if cur.rowcount > 0:
            updated += 1
        
        time.sleep(0.1)  # Rate limit
    
    if spot_id % 20 == 0:
        conn.commit()
        print('  Progress: %d/%d spots, %d facilities updated' % (spot_id, len(spots), updated))

conn.commit()
cur.close()
conn.close()
print('\nDone! %d facilities updated with real Amap POI coordinates' % updated)
