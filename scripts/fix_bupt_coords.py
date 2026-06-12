import pymysql
c=pymysql.connect(host='localhost',port=3306,user='root',password='root123',database='journeycraft',charset='utf8mb4').cursor()

# Fix: recalculate with actual DB coordinates
c.execute("SELECT id, latitude, longitude FROM spots WHERE name LIKE '%北京邮电%'")
bupt_id, base_lat, base_lng = c.fetchone()
print('Actual BUPT coords: %.6f, %.6f' % (base_lat, base_lng))

# Get all facilities for BUPT
c.execute("SELECT id, name, latitude, longitude FROM facilities WHERE spot_id=%d" % bupt_id)
facilities = c.fetchall()
print('Total facilities to fix: %d' % len(facilities))

# Approximate base used in script
old_base_lat, old_base_lng = 40.155, 116.275
# Correct offset
dlat = base_lat - old_base_lat
dlng = base_lng - old_base_lng
print('Offset: %.6f, %.6f' % (dlat, dlng))

for fid, fname, flat, flng in facilities:
    new_lat = flat + dlat
    new_lng = flng + dlng
    c.execute("UPDATE facilities SET latitude=%.10f, longitude=%.10f WHERE id=%d" % (new_lat, new_lng, fid))

c.connection.commit()
c.close()
print('Fixed coordinates for all %d facilities' % len(facilities))
