import pymysql
c = pymysql.connect(host='localhost',port=3306,user='root',password='root123',database='journeycraft',charset='utf8mb4').cursor()
c.execute("DELETE FROM facilities WHERE spot_id=359 AND category='SERVICE' AND name NOT LIKE '%北京邮电%' AND name NOT LIKE '%北邮%'")
c.connection.commit()
c.execute('SELECT COUNT(*) FROM facilities WHERE spot_id=359')
print('BUPT facilities: %d' % c.fetchone()[0])
c.execute('SELECT name,category FROM facilities WHERE spot_id=359 ORDER BY category')
for r in c.fetchall():
    print('  [%s] %s' % (r[1], r[0]))
