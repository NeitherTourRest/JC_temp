# -*- coding: utf-8 -*-
"""补充景点至 200+，包含沙河大集、小寨大集等。"""
import requests, pymysql, time, math, sys

AMAP_KEY = '110ddf432672d1160770712e7f9d26d0'
DB = {"host":"localhost","port":3306,"user":"root","password":"root123","database":"journeycraft","charset":"utf8mb4"}

PI = 3.141592653589793
A = 6378245.0
EE = 0.00669342162296594323

def gcj02_to_wgs84(lat, lng):
    if lng < 72 or lng > 137 or lat < 0.8 or lat > 55: return lat, lng
    def tlat(x, y):
        ret = -100+2*x+3*y+0.2*y*y+0.1*x*y+0.2*math.sqrt(abs(x))
        ret += (20*math.sin(6*x*PI)+20*math.sin(2*x*PI))*2/3
        ret += (20*math.sin(y*PI)+40*math.sin(y/3*PI))*2/3
        ret += (160*math.sin(y/12*PI)+320*math.sin(y*PI/30))*2/3
        return ret
    def tlng(x, y):
        ret = 300+x+2*y+0.1*x*x+0.1*x*y+0.1*math.sqrt(abs(x))
        ret += (20*math.sin(6*x*PI)+20*math.sin(2*x*PI))*2/3
        ret += (20*math.sin(x*PI)+40*math.sin(x/3*PI))*2/3
        ret += (150*math.sin(x/12*PI)+300*math.sin(x/30*PI))*2/3
        return ret
    dlat = tlat(lng-105, lat-35)
    dlng = tlng(lng-105, lat-35)
    rlat = lat/180*PI
    m = math.sin(rlat)
    mg = 1-EE*m*m
    sm = math.sqrt(mg)
    dlat = dlat*180/((A*(1-EE))/(mg*sm)*PI)
    dlng = dlng*180/(A/sm*math.cos(rlat)*PI)
    return lat-dlat, lng-dlng

def search_poi(keywords, city='昌平', page=1, offset=20):
    url = 'https://restapi.amap.com/v3/place/text'
    params = {'key': AMAP_KEY, 'keywords': keywords, 'city': city, 'offset': offset, 'page': page}
    try:
        r = requests.get(url, params=params, timeout=10)
        d = r.json()
        if d.get('status') == '1':
            return d.get('pois', [])
    except: pass
    return []

conn = pymysql.connect(**DB)
cur = conn.cursor()

# Get existing spot names
cur.execute("SELECT name FROM spots")
existing = set(r[0].strip().lower() for r in cur.fetchall())
sys.stderr.write('Existing spots: %d\n' % len(existing))

# Specific spots to add
specific = [
    ('沙河大集', '商场'),
    ('小寨大集', '商场'),
    ('昌平大集', '商场'),
    ('阳坊大集', '商场'),
    ('回龙观大集', '商场'),
]

# Search for specific spots
added = 0
for name, cat in specific:
    if name.lower() in existing:
        sys.stderr.write('  Already exists: %s\n' % name)
        continue
    pois = search_poi(name, '北京', 1, 5)
    found = False
    for poi in pois:
        pname = poi.get('name', '').strip()
        if pname.lower() in existing:
            continue
        loc = poi.get('location', '')
        if not loc or ',' not in loc: continue
        parts = loc.split(',')
        wlat, wlng = gcj02_to_wgs84(float(parts[1]), float(parts[0]))
        address = poi.get('address', '') or ''
        desc = poi.get('type', '') or ''
        cur.execute("INSERT INTO spots (name,category,description,address,latitude,longitude,popularity,avg_rating,rating_count,congestion_level) VALUES (%s,%s,%s,%s,%s,%s,0,0,0,'EMPTY')",
                   (pname, cat, desc, address, wlat, wlng))
        added += 1
        existing.add(pname.lower())
        sys.stderr.write('  Added: %s\n' % pname)
        found = True
        break
    if not found:
        sys.stderr.write('  Not found on Amap: %s — inserting with estimated coords\n' % name)
        # Use approximate coordinates for Changping
        approx = {'沙河大集':(40.1530,116.2850),'小寨大集':(40.1600,116.2700),'昌平大集':(40.2200,116.2300),'阳坊大集':(40.1350,116.1250),'回龙观大集':(40.0800,116.3300)}
        if name in approx:
            cur.execute("INSERT INTO spots (name,category,description,latitude,longitude,popularity,avg_rating,rating_count,congestion_level) VALUES (%s,%s,%s,%s,%s,0,0,0,'EMPTY')",
                       (name, cat, '昌平区大型集市', approx[name][0], approx[name][1]))
            added += 1
            existing.add(name.lower())
    time.sleep(0.2)

conn.commit()

# Now search Amap for more spots in Changping to reach 200+
cur.execute("SELECT COUNT(*) FROM spots")
count = cur.fetchone()[0]
sys.stderr.write('After specific adds: %d spots\n' % count)

# Search more categories
extra_searches = [
    ('景区', '自然风景区', '景区'),
    ('景区', '文化旅游区', '景区'),
    ('公园', '湿地公园', '公园'),
    ('公园', '郊野公园', '公园'),
    ('商场', '农贸市场', '商场'),
    ('商场', '批发市场', '商场'),
    ('校园', '职业技术学院', '校园'),
]
limit_per_search = 15

for cat, keyword, db_cat in extra_searches:
    if count >= 210:
        break
    pois = search_poi(keyword, '昌平', 1, 20)
    for poi in pois:
        if count >= 210:
            break
        pname = poi.get('name', '').strip()
        if not pname or pname.lower() in existing:
            continue
        loc = poi.get('location', '')
        if not loc or ',' not in loc: continue
        parts = loc.split(',')
        wlat, wlng = gcj02_to_wgs84(float(parts[1]), float(parts[0]))
        address = poi.get('address', '') or ''
        desc = poi.get('type', '') or ''
        cur.execute("INSERT INTO spots (name,category,description,address,latitude,longitude,popularity,avg_rating,rating_count,congestion_level) VALUES (%s,%s,%s,%s,%s,%s,0,0,0,'EMPTY')",
                   (pname, db_cat, desc, address, wlat, wlng))
        count += 1
        existing.add(pname.lower())
    time.sleep(0.3)

conn.commit()
cur.execute("SELECT COUNT(*) FROM spots")
sys.stderr.write('Final spot count: %d\n' % cur.fetchone()[0])
cur.close()
conn.close()
