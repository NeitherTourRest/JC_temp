# -*- coding: utf-8 -*-
"""
1. 清理现有合成设施数据
2. 用高德周边搜索为每个景点查找真实 POI 设施
3. 每个景点保留 1-3 个真实设施
4. 特殊处理：北京邮电大学沙河校区的子楼（网络空间安全学院等）改为设施
"""
import requests, pymysql, time, math

AMAP_KEY = '110ddf432672d1160770712e7f9d26d0'
DB = {"host":"localhost","port":3306,"user":"root","password":"root123","database":"journeycraft","charset":"utf8mb4"}

conn = pymysql.connect(**DB)
cur = conn.cursor()

# ── Step 1: 处理 BUPT 沙河校区 ──
# 找到所有以"北京邮电大学沙河校区"开头的子楼
cur.execute("SELECT id, name, category, latitude, longitude FROM spots WHERE name LIKE '%北京邮电大学%' OR name LIKE '%北邮%'")
bupt_spots = cur.fetchall()
print('BUPT-related spots: %d' % len(bupt_spots))

# 找到主校区
main_bupt = None
sub_buildings = []
for s in bupt_spots:
    name = s[1].strip()
    if name == '北京邮电大学沙河校区' or name == '北京邮电大学(沙河校区)':
        main_bupt = s
    else:
        sub_buildings.append(s)

if main_bupt:
    print('Main BUPT spot: id=%d %s' % (main_bupt[0], main_bupt[1]))
    # 把子楼改为设施，关联到主校区
    for sb in sub_buildings:
        print('  Moving sub-building to facility: %s' % sb[1])
        cur.execute("INSERT INTO facilities (name, category, latitude, longitude, spot_id) VALUES (%s, %s, %s, %s, %s)",
                    (sb[1], 'CLASSROOM', sb[3], sb[4], main_bupt[0]))
        cur.execute("DELETE FROM spots WHERE id=%s", (sb[0],))
    print('  Moved %d sub-buildings to facilities' % len(sub_buildings))

# ── Step 2: 删除所有旧的合成设施 ──
cur.execute("DELETE FROM facilities WHERE id > 0")
conn.commit()
print('Deleted all synthetic facilities')

# ── Step 3: 为景点搜索真实设施 POI ──
# 每个景点最多搜 3 类设施，每类取 1 个结果
cur.execute("SELECT id, name, category, latitude, longitude FROM spots")
spots = cur.fetchall()

# 搜索配置：景点分类 → (关键字列表，每类最多几个)
SEARCH_CONFIG = {
    '景区': [('卫生间', 1), ('停车场', 1), ('售票处', 1)],
    '公园': [('卫生间', 1), ('停车场', 1)],
    '商场': [('停车场', 1), ('卫生间', 1)],
    '校园': [('教学楼', 2), ('图书馆', 1), ('食堂', 1), ('体育场', 1)],
}

# GCJ-02 → WGS-84
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
    ret += (150.0*math.sin(x/12.0*PI) + 320.0*math.sin(x*PI/30.0)) * 2.0/3.0
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

total_added = 0
searched = 0

for spot_id, spot_name, category, lat, lng in spots:
    config = SEARCH_CONFIG.get(category, [])
    if not config:
        continue
    
    for keyword, max_count in config:
        # 周边搜索
        searched += 1
        try:
            url = 'https://restapi.amap.com/v3/place/around'
            params = {
                'key': AMAP_KEY,
                'location': '%f,%f' % (lng, lat),
                'keywords': keyword,
                'radius': 800,
                'offset': max_count,
                'page': 1,
            }
            r = requests.get(url, params=params, timeout=10)
            data = r.json()
            if data.get('status') != '1':
                continue
            pois = data.get('pois', [])
            for poi in pois[:max_count]:
                loc = poi.get('location', '')
                if not loc or ',' not in loc:
                    continue
                parts = loc.split(',')
                amap_lat, amap_lng = float(parts[1]), float(parts[0])
                wgs_lat, wgs_lng = gcj02_to_wgs84(amap_lat, amap_lng)
                poi_name = poi.get('name', keyword)
                
                cur.execute(
                    "INSERT INTO facilities (name, category, latitude, longitude, spot_id) VALUES (%s, %s, %s, %s, %s)",
                    (poi_name, keyword.upper()[:20], wgs_lat, wgs_lng, spot_id)
                )
                total_added += 1
        except:
            pass
        
        time.sleep(0.15)  # Rate limit
    
    if spot_id % 20 == 0:
        conn.commit()
        print('  Progress: %d spots searched, %d facilities found' % (searched, total_added))

conn.commit()
cur.close()
conn.close()
print('\nDone! Added %d real POI facilities (searched %d times)' % (total_added, searched))
