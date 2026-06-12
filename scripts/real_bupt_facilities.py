# -*- coding: utf-8 -*-
"""
为北邮沙河校区搜索真实高德 POI 设施，删除旧的合成数据。
"""
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

conn = pymysql.connect(**DB)
cur = conn.cursor()

# Get BUPT spot
cur.execute("SELECT id, latitude, longitude FROM spots WHERE name LIKE '%北京邮电%'")
r = cur.fetchone()
bupt_id, base_lat, base_lng = r
print('BUPT: (%.6f, %.6f)' % (base_lat, base_lng), file=sys.stderr)

# Delete old synthetic facilities
cur.execute("DELETE FROM facilities WHERE spot_id=%d" % bupt_id)
conn.commit()
print('Deleted old BUPT facilities', file=sys.stderr)

# Search Amap for real POIs around BUPT campus
search_keywords = [
    '北京邮电大学沙河校区教学楼', '教学楼', '图书馆',
    '食堂', '宿舍', '体育场', '体育馆',
    '超市', '咖啡厅', '校医院',
    '浴室', '洗衣房', '打印店',
]

added = 0
for kw in search_keywords:
    try:
        url = 'https://restapi.amap.com/v3/place/around'
        params = {'key':AMAP_KEY,'location':'%f,%f'%(base_lng,base_lat),'keywords':kw,'radius':1000,'offset':10,'page':1}
        r = requests.get(url, params=params, timeout=10)
        d = r.json()
        if d.get('status') != '1': continue
        for poi in d.get('pois',[]):
            loc = poi.get('location','')
            if not loc or ',' not in loc: continue
            parts = loc.split(',')
            wlat, wlng = gcj02_to_wgs84(float(parts[1]), float(parts[0]))
            pname = poi.get('name','')
            ptype = poi.get('type','')
            # Categorize
            cat = 'SERVICE'
            t = ptype + ' ' + pname
            if '教学' in t or '实验' in t: cat = 'CLASSROOM'
            elif '图书' in t: cat = 'LIBRARY'
            elif '食堂' in t or '餐厅' in t or '餐饮' in t: cat = 'CAFETERIA'
            elif '宿舍' in t or '公寓' in t: cat = 'DORMITORY'
            elif '体育' in t or '操场' in t or '球场' in t or '游泳' in t: cat = 'GYM'
            elif '超市' in t or '便利店' in t: cat = 'SUPERMARKET'
            elif '咖啡' in t: cat = 'CAFE'
            elif '医院' in t or '医疗' in t or '医务' in t: cat = 'HOSPITAL'
            elif '打印' in t or '复印' in t: cat = 'SERVICE'
            elif '理发' in t or '洗衣' in t or '浴室' in t: cat = 'SERVICE'
            elif '停车' in t: cat = 'PARKING'
            elif '卫生' in t or '厕所' in t or '洗手' in t: cat = 'TOILET'
            elif '邮电大学' in pname: cat = 'CLASSROOM'
            cur.execute("INSERT INTO facilities (name,category,latitude,longitude,spot_id) VALUES (%s,%s,%s,%s,%s)",
                       (pname, cat, wlat, wlng, bupt_id))
            added += 1
        time.sleep(0.15)
    except Exception as e:
        print('Error searching "%s": %s' % (kw, e), file=sys.stderr)

# Also do a broader search without keyword to catch everything
try:
    url = 'https://restapi.amap.com/v3/place/around'
    params = {'key':AMAP_KEY,'location':'%f,%f'%(base_lng,base_lat),'radius':500,'offset':20}
    r = requests.get(url, params=params, timeout=10)
    d = r.json()
    if d.get('status') == '1':
        seen_names = set()
        for poi in d.get('pois',[]):
            loc = poi.get('location','')
            if not loc or ',' not in loc: continue
            parts = loc.split(',')
            pname = poi.get('name','')
            if pname in seen_names: continue
            seen_names.add(pname)
            wlat, wlng = gcj02_to_wgs84(float(parts[1]), float(parts[0]))
            ptype = poi.get('type','')
            cat = 'SERVICE'
            t = ptype + ' ' + pname
            if '教学' in t or '实验' in t: cat = 'CLASSROOM'
            elif '图书' in t: cat = 'LIBRARY'
            elif '食堂' in t or '餐厅' in t: cat = 'CAFETERIA'
            elif '宿舍' in t or '公寓' in t: cat = 'DORMITORY'
            elif '体育' in t or '操场' in t: cat = 'GYM'
            elif '超市' in t or '便利店' in t: cat = 'SUPERMARKET'
            elif '咖啡' in t: cat = 'CAFE'
            elif '医院' in t or '医务' in t: cat = 'HOSPITAL'
            elif '停车' in t: cat = 'PARKING'
            elif '卫生' in t or '厕所' in t: cat = 'TOILET'
            cur.execute("INSERT INTO facilities (name,category,latitude,longitude,spot_id) VALUES (%s,%s,%s,%s,%s)",
                       (pname, cat, wlat, wlng, bupt_id))
            added += 1
except: pass

conn.commit()
cur.execute("SELECT COUNT(*) FROM facilities WHERE spot_id=%d" % bupt_id)
print('Real BUPT facilities: %d' % cur.fetchone()[0], file=sys.stderr)
cur.close()
conn.close()
