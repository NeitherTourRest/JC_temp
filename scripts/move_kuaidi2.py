import pymysql, math
c = pymysql.connect(host='localhost',port=3306,user='root',password='root123',database='journeycraft',charset='utf8mb4').cursor()
c.execute("SELECT id, latitude FROM facilities WHERE spot_id=359 AND name LIKE '%快递%'")
r = c.fetchone()
fid, lat = r[0], r[1]
dlng = 200.0 / (111000.0 * math.cos(lat / 180 * math.pi))
c.execute("UPDATE facilities SET longitude = longitude - %s WHERE id = %s", (dlng, fid))
c.connection.commit()
c.execute("SELECT latitude, longitude FROM facilities WHERE id = %s", (fid,))
r2 = c.fetchone()
print('New: %.6f, %.6f' % (r2[0], r2[1]))
c.close()
