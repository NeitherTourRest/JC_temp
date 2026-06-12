import pymysql
c = pymysql.connect(host='localhost',port=3306,user='root',password='root123',database='journeycraft',charset='utf8mb4').cursor()
c.execute("SELECT id, name, latitude, longitude FROM facilities WHERE spot_id=359 AND name LIKE '%外卖%'")
for r in c.fetchall():
    print('id=%d %s: %.6f, %.6f' % (r[0], r[1], r[2], r[3]))
