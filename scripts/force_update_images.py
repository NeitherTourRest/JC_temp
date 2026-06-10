"""Force update image URLs for all spots and foods."""
import pymysql, os, re

DB = {
    "host": "localhost", "port": 3306,
    "user": "root", "password": "root123",
    "database": "journeycraft", "charset": "utf8mb4",
}

SQL_PATH = os.path.expanduser("~/journeycraft-uploads/update_images.sql")

with open(SQL_PATH, "rb") as f:
    content = f.read().decode("utf-8")

stmts = [
    s.strip() for s in content.split("\n")
    if s.strip().startswith("UPDATE")
]

conn = pymysql.connect(**DB)
cur = conn.cursor()
ok = fail = 0

for sql in stmts:
    forced = sql.replace("AND image_url IS NULL", "")
    m = re.search(r"SET image_url = '([^']+)'", sql)
    nm = re.search(r"WHERE name = '([^']+)'", sql)
    name = nm.group(1) if nm else "?"
    url = m.group(1) if m else "?"
    try:
        cur.execute(forced)
        if cur.rowcount > 0:
            print(f"  OK: {name}")
            ok += 1
        else:
            print(f"  SKIP: {name} (not found)")
    except Exception as e:
        print(f"  FAIL: {name}: {e}")
        fail += 1

conn.commit()
cur.close()
conn.close()
print(f"\nDone: {ok} updated, {fail} failed")
