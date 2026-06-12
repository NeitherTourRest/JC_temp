import pymysql, math

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

# Amap returned these GCJ-02 coordinates for BUPT facilities
bupt_gcj = [
    ('学生活动中心', 'SERVICE', 40.159025, 116.290157),
    ('马克思主义学院楼', 'CLASSROOM', 40.158325, 116.293875),
    ('数字媒体与设计艺术学院楼', 'CLASSROOM', 40.159643, 116.293166),
    ('网络空间安全学院楼', 'CLASSROOM', 40.160395, 116.293219),
    ('人文学院楼', 'CLASSROOM', 40.158695, 116.294542),
    ('经济管理学院楼', 'CLASSROOM', 40.157000, 116.295108),
]

import pymysql
c = pymysql.connect(host='localhost',port=3306,user='root',password='root123',database='journeycraft',charset='utf8mb4').cursor()

for name, cat, g_lat, g_lng in bupt_gcj:
    wlat, wlng = gcj02_to_wgs84(g_lat, g_lng)
    c.execute("INSERT INTO facilities (name,category,latitude,longitude,spot_id) VALUES (%s,%s,%s,%s,359)",
             (name, cat, wlat, wlng))
    print('Added: %s (%.6f, %.6f)' % (name, wlat, wlng))

c.connection.commit()
c.execute('SELECT COUNT(*) FROM facilities WHERE spot_id=359')
print('Total BUPT facilities: %d' % c.fetchone()[0])
c.close()
