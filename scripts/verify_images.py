import pymysql
c=pymysql.connect(host='localhost',port=3306,user='root',password='root123',database='journeycraft',charset='utf8mb4').cursor()
c.execute("SELECT COUNT(*) FROM spots WHERE image_url IS NOT NULL AND image_url != ''")
print('Spots with images:', c.fetchone()[0])
c.execute('SELECT COUNT(*) FROM spots')
print('Total spots:', c.fetchone()[0])
