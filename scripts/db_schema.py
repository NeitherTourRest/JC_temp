import pymysql

conn = pymysql.connect(host='localhost', port=3306, user='root', password='root123', database='journeycraft', charset='utf8mb4')
cur = conn.cursor()

cur.execute("SHOW TABLES")
tables = [t[0] for t in cur.fetchall()]

print("=== MySQL \u8868 ===")
for t in sorted(tables):
    print(f"\n--- {t} ---")
    cur.execute(f"DESCRIBE {t}")
    for c in cur.fetchall():
        nullable = "NULL" if c[2] == "YES" else "NOT NULL"
        key = ""
        if c[3] == "PRI":
            key = " PK"
        elif c[3] == "MUL":
            key = " FK"
        print(f"  {c[0]:30s} {c[1]:25s} {nullable:10s}{key}")

    # Foreign keys via SHOW CREATE TABLE
    cur.execute(f"SHOW CREATE TABLE {t}")
    create_sql = cur.fetchone()[1]
    for line in create_sql.split("\n"):
        if "FOREIGN KEY" in line:
            print(f"  {line.strip()}")

conn.close()

print("\n\n=== MongoDB \u96c6\u5408 ===")
import pymongo
mc = pymongo.MongoClient("mongodb://localhost:27017/")
db = mc["JourneyCraft"]
for col in db.list_collection_names():
    doc = db[col].find_one()
    if doc:
        keys = list(doc.keys())[:10]
        print(f"\n--- {col} ---")
        print(f"  Fields: {', '.join(keys)}{'...' if len(list(doc.keys())) > 10 else ''}")
        print(f"  Docs: {db[col].count_documents({})}")
    else:
        print(f"\n--- {col} --- (empty)")
