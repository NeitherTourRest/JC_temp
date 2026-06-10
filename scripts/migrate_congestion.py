"""Migrate congestion_reports table to new unified schema with unique constraint."""
import pymysql

conn = pymysql.connect(host='localhost',port=3306,user='root',password='root123',database='journeycraft',charset='utf8mb4')
cur = conn.cursor()

print("1. Drop old indexes...")
try: cur.execute("DROP INDEX idx_congestion_spot ON congestion_reports")
except: print("   (no idx_congestion_spot)")
try: cur.execute("DROP INDEX idx_congestion_time ON congestion_reports")
except: print("   (no idx_congestion_time)")

print("2. Add target_type and target_id columns...")
try: cur.execute("ALTER TABLE congestion_reports ADD COLUMN target_type VARCHAR(10) NOT NULL DEFAULT 'SPOT' AFTER id")
except: print("   (target_type may already exist)")
try: cur.execute("ALTER TABLE congestion_reports ADD COLUMN target_id BIGINT NOT NULL DEFAULT 0 AFTER target_type")
except: print("   (target_id may already exist)")

print("3. Migrate old spot_id data to target_type/target_id...")
cur.execute("UPDATE congestion_reports SET target_type = 'SPOT', target_id = spot_id WHERE target_id = 0")
print(f"   Updated {cur.rowcount} rows")

print("4. Remove duplicate old rows (keep only latest per user+target)...")
cur.execute("""
    DELETE FROM congestion_reports 
    WHERE id NOT IN (
        SELECT * FROM (
            SELECT MAX(id) FROM congestion_reports 
            GROUP BY target_type, target_id, user_id
        ) AS keep_ids
    )
""")
print(f"   Removed {cur.rowcount} duplicate rows")

print("5. Drop old spot_id column...")
try: cur.execute("ALTER TABLE congestion_reports DROP COLUMN spot_id")
except: print("   (spot_id already dropped)")

print("6. Add unique constraint...")
try: cur.execute("ALTER TABLE congestion_reports ADD CONSTRAINT uk_congestion_user_target UNIQUE (target_type, target_id, user_id)")
except: print("   (constraint may already exist)")

conn.commit()

print("7. Verify...")
cur.execute("SHOW CREATE TABLE congestion_reports")
print(cur.fetchone()[1])

cur.close()
conn.close()
print("\nDone!")
