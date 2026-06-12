import pymysql, math, random
random.seed(42)

c=pymysql.connect(host='localhost',port=3306,user='root',password='root123',database='journeycraft',charset='utf8mb4').cursor()

# Find BUPT spot
c.execute("SELECT id, name, latitude, longitude FROM spots WHERE name LIKE '%北京邮电%'")
r = c.fetchone()
if not r:
    print('BUPT spot not found!')
    exit()
bupt_id, bupt_name, lat, lng = r
print('BUPT spot: id=%d %s (%.6f, %.6f)' % (bupt_id, bupt_name, lat, lng))

# Check existing facilities
c.execute("SELECT COUNT(*) FROM facilities WHERE spot_id=%d" % bupt_id)
print('Existing facilities: %d' % c.fetchone()[0])

# Remove existing auto-generated facilities (keep user-added ones if any)
c.execute("DELETE FROM facilities WHERE spot_id=%d AND category NOT IN ('CLASSROOM','DORMITORY')" % bupt_id)
c.execute("DELETE FROM facilities WHERE spot_id=%d AND name LIKE '%%北京邮电%%'" % bupt_id)

# BUPT 沙河校区 facilities
# Each facility gets coordinates offset slightly from the main campus center (lat=40.155, lng=116.275)
base_lat, base_lng = 40.155, 116.275

facilities = [
    # (name, category, lat_offset, lng_offset)
    # 教学区
    ('教学楼S1', 'CLASSROOM', 0.0015, -0.0010),
    ('教学楼S2', 'CLASSROOM', 0.0015, 0.0010),
    ('教学楼N1', 'CLASSROOM', -0.0010, -0.0012),
    ('教学楼N2', 'CLASSROOM', -0.0010, 0.0012),
    ('综合实验楼', 'CLASSROOM', 0.0005, -0.0020),
    ('计算机学院楼', 'CLASSROOM', 0.0020, -0.0005),
    ('网络空间安全学院楼', 'CLASSROOM', 0.0020, 0.0005),
    ('信息与通信工程学院楼', 'CLASSROOM', -0.0015, -0.0018),
    ('电子工程学院楼', 'CLASSROOM', -0.0015, 0.0018),
    ('人工智能学院楼', 'CLASSROOM', 0.0025, -0.0010),
    ('现代邮政学院楼', 'CLASSROOM', 0.0025, 0.0010),
    ('理学院楼', 'CLASSROOM', -0.0020, -0.0015),
    ('经济管理学院楼', 'CLASSROOM', -0.0020, 0.0015),
    ('人文学院楼', 'CLASSROOM', 0.0010, -0.0025),
    ('马克思主义学院楼', 'CLASSROOM', 0.0010, 0.0025),
    
    # 图书馆
    ('图书馆', 'LIBRARY', 0.0000, -0.0005),
    ('沙河校区图书馆', 'LIBRARY', -0.0003, 0.0003),
    
    # 宿舍区
    ('学生宿舍1号楼', 'DORMITORY', -0.0025, -0.0020),
    ('学生宿舍2号楼', 'DORMITORY', -0.0025, -0.0010),
    ('学生宿舍3号楼', 'DORMITORY', -0.0025, 0.0000),
    ('学生宿舍4号楼', 'DORMITORY', -0.0025, 0.0010),
    ('学生宿舍5号楼', 'DORMITORY', -0.0025, 0.0020),
    ('学生宿舍6号楼', 'DORMITORY', -0.0035, -0.0015),
    ('学生宿舍7号楼', 'DORMITORY', -0.0035, -0.0005),
    ('学生宿舍8号楼', 'DORMITORY', -0.0035, 0.0005),
    ('学生宿舍9号楼', 'DORMITORY', -0.0035, 0.0015),
    ('研究生宿舍楼', 'DORMITORY', -0.0040, 0.0000),
    ('留学生公寓', 'DORMITORY', -0.0045, 0.0010),
    ('教师公寓', 'DORMITORY', -0.0030, 0.0025),
    
    # 食堂
    ('学生食堂一楼', 'CAFETERIA', 0.0005, -0.0015),
    ('学生食堂二楼', 'CAFETERIA', 0.0005, -0.0015),  # same building, different floor
    ('清真食堂', 'CAFETERIA', 0.0008, -0.0010),
    ('教工餐厅', 'CAFETERIA', -0.0010, -0.0008),
    ('民族餐厅', 'CAFETERIA', 0.0003, -0.0018),
    ('风味餐厅', 'CAFETERIA', 0.0007, -0.0013),
    
    # 体育场馆
    ('体育场', 'GYM', -0.0015, -0.0025),
    ('田径场', 'GYM', -0.0020, -0.0028),
    ('足球场', 'GYM', -0.0018, -0.0022),
    ('篮球场', 'GYM', -0.0005, -0.0025),
    ('网球场', 'GYM', 0.0000, -0.0028),
    ('排球场', 'GYM', -0.0010, -0.0025),
    ('体育馆', 'GYM', -0.0015, -0.0005),
    ('游泳馆', 'GYM', -0.0018, 0.0000),
    ('健身房', 'GYM', -0.0010, -0.0010),
    
    # 生活服务
    ('校园超市', 'SUPERMARKET', 0.0000, -0.0010),
    ('学生超市', 'SUPERMARKET', -0.0005, -0.0015),
    ('京东便利店', 'SUPERMARKET', 0.0002, -0.0012),
    ('咖啡厅', 'CAFE', 0.0005, -0.0005),
    ('打印店', 'SERVICE', 0.0003, -0.0013),
    ('邮局', 'SERVICE', -0.0005, 0.0005),
    ('中国邮政', 'SERVICE', -0.0005, 0.0005),
    ('理发店', 'SERVICE', -0.0002, -0.0015),
    ('洗衣房', 'SERVICE', -0.0008, -0.0015),
    ('浴室', 'SERVICE', -0.0020, -0.0010),
    
    # 医疗
    ('校医院', 'HOSPITAL', -0.0020, 0.0020),
    ('医务室', 'HOSPITAL', -0.0008, 0.0008),
    ('心理咨询中心', 'HOSPITAL', -0.0003, -0.0003),
    
    # 基础设施
    ('主校门', 'SERVICE', 0.0030, 0.0000),
    ('南门', 'SERVICE', -0.0030, 0.0000),
    ('北门', 'SERVICE', 0.0000, 0.0030),
    ('东门', 'SERVICE', 0.0010, 0.0000),
    ('西门', 'SERVICE', -0.0005, -0.0030),
    ('停车场', 'PARKING', 0.0020, 0.0020),
    ('地下停车场', 'PARKING', 0.0015, 0.0015),
    ('自行车棚', 'PARKING', -0.0005, -0.0020),
    
    # 卫生间（分布在各区域）
    ('教学楼卫生间', 'TOILET', 0.0010, -0.0005),
    ('图书馆卫生间', 'TOILET', 0.0000, 0.0000),
    ('食堂卫生间', 'TOILET', 0.0005, -0.0010),
    ('体育场卫生间', 'TOILET', -0.0015, -0.0020),
    ('宿舍区卫生间', 'TOILET', -0.0030, 0.0000),
]

total = 0
for name, cat, loff, loff2 in facilities:
    f_lat = base_lat + loff
    f_lng = base_lng + loff2
    c.execute("INSERT INTO facilities (name,category,latitude,longitude,spot_id) VALUES (%s,%s,%s,%s,%s)",
             (name, cat, f_lat, f_lng, bupt_id))
    total += 1

print('Added %d facilities for BUPT' % total)
c.connection.commit()
c.close()
