import pymysql
conn = pymysql.connect(host='localhost',port=3306,user='root',password='root123',database='journeycraft',charset='utf8mb4')
cur = conn.cursor()
cur.execute("SHOW CREATE TABLE congestion_reports")
r = cur.fetchone()
print(r[1])
cur.close(); conn.close()
