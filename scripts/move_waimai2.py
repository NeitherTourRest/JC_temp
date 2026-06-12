import pymysql
c = pymysql.connect(host='localhost',port=3306,user='root',password='root123',database='journeycraft',charset='utf8mb4').cursor()
c.execute("UPDATE facilities SET latitude = latitude + 10.0/111000.0 WHERE id = 2808")
c.connection.commit()
c.execute("SELECT latitude, longitude FROM facilities WHERE id = 2808")
r = c.fetchone()
print('%.6f, %.6f' % (r[0], r[1]))
c.close()
