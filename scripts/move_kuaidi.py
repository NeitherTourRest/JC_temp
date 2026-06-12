import pymysql
c = pymysql.connect(host='localhost',port=3306,user='root',password='root123',database='journeycraft',charset='utf8mb4').cursor()
c.execute("SELECT id, name, latitude, longitude FROM facilities WHERE spot_id=359 AND name LIKE '%快递%'")
for r in c.fetchall():
    print('id=%d %s: %.6f, %.6f' % (r[0], r[1], r[2], r[3]))
    new_lat = r[2] - 100.0/111000.0
    new_lng = r[3] - 120.0/(111000.0*0.764)
    c.execute("UPDATE facilities SET latitude=%s, longitude=%s WHERE id=%s", (new_lat, new_lng, r[0]))
    print('  -> new: %.6f, %.6f' % (new_lat, new_lng))
c.connection.commit()
c.close()
