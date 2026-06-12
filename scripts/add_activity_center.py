import pymysql, math

PI = 3.141592653589793
A = 6378245.0
EE = 0.00669342162296594323

def gcj02_to_wgs84(lat, lng):
    if lng < 72 or lng > 137 or lat < 0.8 or lat > 55: return lat, lng
    x, y = lng - 105.0, lat - 35.0
    dlat = -100 + 2*x + 3*y + 0.2*y*y + 0.1*x*y + 0.2*math.sqrt(abs(x))
    dlat += (20*math.sin(6*x*PI) + 20*math.sin(2*x*PI)) * 2/3
    dlat += (20*math.sin(y*PI) + 40*math.sin(y/3*PI)) * 2/3
    dlat += (160*math.sin(y/12*PI) + 320*math.sin(y*PI/30)) * 2/3
    dlng = 300 + x + 2*y + 0.1*x*x + 0.1*x*y + 0.1*math.sqrt(abs(x))
    dlng += (20*math.sin(6*x*PI) + 20*math.sin(2*x*PI)) * 2/3
    dlng += (20*math.sin(x*PI) + 40*math.sin(x/3*PI)) * 2/3
    dlng += (150*math.sin(x/12*PI) + 300*math.sin(x/30*PI)) * 2/3
    radlat = lat/180*PI
    magic = math.sin(radlat)
    magic = 1 - EE*magic*magic
    sqrtmagic = math.sqrt(magic)
    dlat = dlat*180 / ((A*(1-EE))/(magic*sqrtmagic)*PI)
    dlng = dlng*180 / (A/sqrtmagic*math.cos(radlat)*PI)
    return lat-dlat, lng-dlng

wlat, wlng = gcj02_to_wgs84(40.159025, 116.290157)
c = pymysql.connect(host='localhost',port=3306,user='root',password='root123',database='journeycraft',charset='utf8mb4').cursor()
c.execute("INSERT INTO facilities (name,category,latitude,longitude,spot_id) VALUES (%s,%s,%s,%s,359)",
         ('学生活动中心', 'SERVICE', wlat, wlng))
c.connection.commit()
c.execute('SELECT COUNT(*) FROM facilities WHERE spot_id=359')
print('BUPT facilities: %d' % c.fetchone()[0])
c.close()
