import pymysql
c = pymysql.connect(host='localhost',port=3306,user='root',password='root123',database='journeycraft',charset='utf8mb4').cursor()
c.execute("SELECT id, name FROM facilities WHERE name LIKE '%网络%' OR name LIKE '%安全%'")
r = c.fetchall()
print('Matches:', len(r))
for row in r:
    print('  %d: %s' % (row[0], row[1]))
# Show BUPT facilities
c.execute("SELECT id, name FROM facilities WHERE name LIKE '%北邮%' OR name LIKE '%邮电%'")
r = c.fetchall()
print('BUPT facilities:', len(r))
for row in r:
    print('  %d: %s' % (row[0], row[1]))
