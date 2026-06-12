import pymysql
c = pymysql.connect(host='localhost',port=3306,user='root',password='root123',database='journeycraft',charset='utf8mb4').cursor()
# Check BUPT spots
c.execute("SELECT id, name FROM spots WHERE name LIKE '%北京邮电%'")
for r in c.fetchall():
    print('BUPT spot:', r[0], r[1])
# Check BUPT facilities
c.execute("SELECT id, name FROM facilities WHERE name LIKE '%北京邮电%'")
for r in c.fetchall():
    print('BUPT facility:', r[0], r[1])
# Facility count
c.execute("SELECT COUNT(*) FROM facilities")
print('Total facilities:', c.fetchone()[0])
c.execute("SELECT COUNT(*) FROM spots")
print('Total spots:', c.fetchone()[0])
