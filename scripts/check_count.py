import pymysql
c = pymysql.connect(host='localhost',port=3306,user='root',password='root123',database='journeycraft',charset='utf8mb4').cursor()
c.execute('SELECT COUNT(*) FROM spots')
print('Total spots:', c.fetchone()[0])
c.execute('SELECT category,COUNT(*) FROM spots GROUP BY category ORDER BY COUNT(*) DESC')
for r in c.fetchall():
    print('  %s: %d' % (r[0], r[1]))
c.execute('SELECT name,category FROM spots WHERE name LIKE "%大集%"')
for r in c.fetchall():
    print('  Market: %s (%s)' % (r[0], r[1]))
