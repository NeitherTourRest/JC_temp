# -*- coding: utf-8 -*-
import requests, pymysql, time, math, sys

AMAP_KEY = '110ddf432672d1160770712e7f9d26d0'
DB = {"host":"localhost","port":3306,"user":"root","password":"root123","database":"journeycraft","charset":"utf8mb4"}

conn = pymysql.connect(**DB)
cur = conn.cursor()

# Step 1: Handle BUPT sub-buildings
cur.execute("SELECT id, name, latitude, longitude FROM spots WHERE name LIKE '%北京邮电大学%' AND name != '北京邮电大学沙河校区'")
subs = cur.fetchall()
for s in subs:
    sys.stderr.write('Moving to facility: %s\n' % s[1])
    cur.execute("INSERT INTO facilities (name,category,latitude,longitude,spot_id) VALUES (%s,'CLASSROOM',%s,%s,(SELECT id FROM spots WHERE name='北京邮电大学沙河校区'))",
                (s[1], s[2], s[3]))
    cur.execute("DELETE FROM spots WHERE id=%s", (s[0],))
conn.commit()
sys.stderr.write('BUPT done\n')

# Step 2: Delete old facilities
cur.execute("DELETE FROM facilities")
conn.commit()
sys.stderr.write('Deleted old facilities\n')

# Step 3: Search real POIs
cur.execute("SELECT id, name, category, latitude, longitude FROM spots")
spots = cur.fetchall()
sys.stderr.write('Spots: %d\n' % len(spots))

SEARCH = {
    '景区': [('卫生间',1), ('停车场',1)],
    '公园': [('卫生间',1), ('停车场',1)],
    '商场': [('卫生间',1), ('停车场',1)],
    '校园': [('教学楼',2), ('图书馆',1)],
}

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

total = 0
n = 0
for sid, sname, cat, lat, lng in spots:
    config = SEARCH.get(cat, [])
    n += 1
    for kw, mx in config:
        try:
            url = 'https://restapi.amap.com/v3/place/around'
            r = requests.get(url, params={'key':AMAP_KEY,'location':'%f,%f'%(lng,lat),'keywords':kw,'radius':800,'offset':mx}, timeout=10)
            d = r.json()
            if d.get('status') != '1': continue
            for poi in d.get('pois',[])[:mx]:
                loc = poi.get('location','')
                if ',' not in loc: continue
                p = loc.split(',')
                wlat, wlng = gcj02_to_wgs84(float(p[1]), float(p[0]))
                cur.execute("INSERT INTO facilities (name,category,latitude,longitude,spot_id) VALUES (%s,%s,%s,%s,%s)",
                           (poi.get('name',kw), kw.upper()[:20], wlat, wlng, sid))
                total += 1
            time.sleep(0.15)
        except: pass
    if n % 30 == 0:
        conn.commit()
        sys.stderr.write('  %d/%d spots, %d facilities\n' % (n, len(spots), total))

conn.commit()
cur.close()
conn.close()
sys.stderr.write('Done! %d facilities from real POIs\n' % total)
