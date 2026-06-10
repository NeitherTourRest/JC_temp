"""Check current image URLs in database."""
import pymysql

conn = pymysql.connect(
    host="localhost", port=3306,
    user="root", password="root123",
    database="journeycraft", charset="utf8mb4",
)
cur = conn.cursor()

cur.execute("SELECT id, name, image_url FROM spots ORDER BY id")
spots = cur.fetchall()
for s in spots:
    print(f"Spot {s[0]}: {s[1][:20]:<20s} -> {s[2] or '(null)'}")

print()
cur.execute("SELECT id, name, image_url FROM foods ORDER BY id")
foods = cur.fetchall()
for f in foods:
    print(f"Food {f[0]}: {f[1][:25]:<25s} -> {f[2] or '(null)'}")

cur.close()
conn.close()
