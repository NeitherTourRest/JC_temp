# -*- coding: utf-8 -*-
"""
从高德 Web Service API 获取昌平区景点和设施数据，写入 MySQL。
用法：python import_amap_data.py
"""
import requests, json, pymysql, time, math, re, os

AMAP_KEY = '110ddf432672d1160770712e7f9d26d0'
DB = {"host":"localhost","port":3306,"user":"root","password":"root123","database":"journeycraft","charset":"utf8mb4"}

def search_poi(keywords, city='昌平', page=1, offset=20):
    """调高德 POI 搜索"""
    url = 'https://restapi.amap.com/v3/place/text'
    params = {'key': AMAP_KEY, 'keywords': keywords, 'city': city, 'offset': offset, 'page': page, 'extensions': 'all'}
    r = requests.get(url, params=params, timeout=10)
    data = r.json()
    if data.get('status') != '1':
        print(f'  [ERR] {keywords}: {data.get("info","")}')
        return []
    return data.get('pois', [])

def search_all(keywords, city='昌平', max_results=50):
    """自动翻页"""
    all_pois = []
    page = 1
    while len(all_pois) < max_results:
        pois = search_poi(keywords, city, page, 20)
        if not pois:
            break
        all_pois.extend(pois)
        if len(pois) < 20:
            break
        page += 1
        time.sleep(0.3)
    return all_pois[:max_results]

# ── GCJ-02 → WGS-84 ──
PI = 3.141592653589793
A = 6378245.0
EE = 0.00669342162296594323

def transform_lat(x, y):
    ret = -100.0 + 2.0*x + 3.0*y + 0.2*y*y + 0.1*x*y + 0.2*math.sqrt(abs(x))
    ret += (20.0*math.sin(6.0*x*PI) + 20.0*math.sin(2.0*x*PI)) * 2.0/3.0
    ret += (20.0*math.sin(y*PI) + 40.0*math.sin(y/3.0*PI)) * 2.0/3.0
    ret += (160.0*math.sin(y/12.0*PI) + 320.0*math.sin(y*PI/30.0)) * 2.0/3.0
    return ret

def transform_lng(x, y):
    ret = 300.0 + x + 2.0*y + 0.1*x*x + 0.1*x*y + 0.1*math.sqrt(abs(x))
    ret += (20.0*math.sin(6.0*x*PI) + 20.0*math.sin(2.0*x*PI)) * 2.0/3.0
    ret += (20.0*math.sin(x*PI) + 40.0*math.sin(x/3.0*PI)) * 2.0/3.0
    ret += (150.0*math.sin(x/12.0*PI) + 300.0*math.sin(x/30.0*PI)) * 2.0/3.0
    return ret

def gcj02_to_wgs84(lat, lng):
    if lng < 72 or lng > 137 or lat < 0.8 or lat > 55:
        return lat, lng
    dlat = transform_lat(lng-105.0, lat-35.0)
    dlng = transform_lng(lng-105.0, lat-35.0)
    radlat = lat/180.0*PI
    magic = math.sin(radlat)
    magic = 1 - EE*magic*magic
    sqrtmagic = math.sqrt(magic)
    dlat = (dlat*180.0)/((A*(1-EE))/(magic*sqrtmagic)*PI)
    dlng = (dlng*180.0)/(A/sqrtmagic*math.cos(radlat)*PI)
    return lat-dlat, lng-dlng

def extract_location(poi):
    loc = poi.get('location', '')
    if loc and ',' in loc:
        lng, lat = map(float, loc.split(','))
        return gcj02_to_wgs84(lat, lng)
    return None, None

# ── Step 1: Import Spots ──
def import_spots():
    conn = pymysql.connect(**DB)
    cur = conn.cursor()
    
    # Clear dependent tables
    cur.execute('DELETE FROM congestion_reports')
    cur.execute('DELETE FROM facilities')
    cur.execute('DELETE FROM spot_reviews')
    cur.execute('DELETE FROM spots')
    conn.commit()
    
    categories = [
        ('景区', '旅游景点', 60),
        ('景区', '名胜古迹', 30),
        ('景区', '博物馆', 20),
        ('公园', '公园', 40),
        ('商场', '购物中心', 25),
        ('校园', '大学', 60),
        ('校园', '学院', 30),
    ]
    
    seen_names = set()
    total = 0
    
    for category, keyword, limit in categories:
        print(f'\n搜索 {category}: {keyword} (上限 {limit})')
        pois = search_all(keyword, '昌平', limit)
        for poi in pois:
            name = poi.get('name', '').strip()
            if not name or name.lower() in seen_names:
                continue
            seen_names.add(name.lower())
            
            lat, lng = extract_location(poi)
            if lat is None:
                continue
            
            address = poi.get('address', '') or ''
            desc = poi.get('type', '') or ''
            
            # Get image from photos
            photos = poi.get('photos', [])
            image_url = ''
            if photos:
                image_url = photos[0].get('url', '')
            
            cur.execute(
                'INSERT INTO spots (name, category, description, address, latitude, longitude, popularity, avg_rating, rating_count, congestion_level, image_url) '
                'VALUES (%s, %s, %s, %s, %s, %s, 0, 0, 0, "EMPTY", %s)',
                (name, category, desc, address, lat, lng, image_url)
            )
            total += 1
            if total % 20 == 0:
                conn.commit()
    
    conn.commit()
    cur.close()
    conn.close()
    print(f'\n=== Spot import complete: {total} spots ===')

# ── Step 2: Import Facilities ──
def import_facilities():
    conn = pymysql.connect(**DB)
    cur = conn.cursor()
    
    # Get all spots
    cur.execute('SELECT id, name, category, latitude, longitude FROM spots')
    spots = cur.fetchall()
    print(f'Generating facilities for {len(spots)} spots')
    
    facility_templates = {
        '景区': [
            ('TOILET', 2, ['卫生间', '洗手间', '公共厕所']),
            ('PARKING', 1, ['停车场']),
            ('TICKET', 1, ['售票处']),
            ('SERVICE', 1, ['游客服务中心']),
            ('CAFE', 1, ['咖啡馆']),
        ],
        '公园': [
            ('TOILET', 2, ['卫生间', '公共厕所']),
            ('PARKING', 1, ['停车场']),
            ('CAFE', 1, ['小卖部']),
        ],
        '商场': [
            ('TOILET', 2, ['卫生间', '洗手间']),
            ('PARKING', 1, ['停车场']),
            ('SUPERMARKET', 1, ['超市']),
            ('CAFE', 1, ['咖啡厅']),
        ],
        '校园': [
            ('TOILET', 5, ['卫生间']),
            ('PARKING', 1, ['停车场']),
            ('CLASSROOM', 5, ['教学楼', '主教学楼', '实验楼', '逸夫楼', '综合楼']),
            ('LIBRARY', 1, ['图书馆']),
            ('DORMITORY', 4, ['学生宿舍', '研究生宿舍', '留学生宿舍', '教师公寓']),
            ('CAFETERIA', 2, ['学生食堂', '教师餐厅']),
            ('GYM', 1, ['体育场']),
            ('SUPERMARKET', 1, ['校园超市']),
            ('HOSPITAL', 1, ['校医院']),
        ],
    }
    
    total = 0
    for spot_id, spot_name, category, lat, lng in spots:
        templates = facility_templates.get(category, [])
        for fac_cat, count, names in templates:
            for i in range(count):
                name = names[i % len(names)]
                # Small random offset
                lat_offset = (hash(f'{spot_id}_{fac_cat}_{i}') % 1000 - 500) / 1000000
                lng_offset = (hash(f'{spot_id}_{fac_cat}_{i}_lng') % 1000 - 500) / 1000000
                cur.execute(
                    'INSERT INTO facilities (name, category, latitude, longitude, spot_id) VALUES (%s, %s, %s, %s, %s)',
                    (name, fac_cat, lat + lat_offset, lng + lng_offset, spot_id)
                )
                total += 1
    
    conn.commit()
    cur.close()
    conn.close()
    print(f'=== Facility import complete: {total} facilities ===')

# ── Step 3: Generate Shops & Foods ──
def import_shops():
    conn = pymysql.connect(**DB)
    cur = conn.cursor()
    
    # Clear
    cur.execute('DELETE FROM food_reviews')
    cur.execute('DELETE FROM foods')
    cur.execute('DELETE FROM shops')
    conn.commit()
    
    # Search for restaurants in Changping
    print('\n搜索餐馆...')
    all_shops = []
    cuisines = ['中餐','川菜','湘菜','粤菜','鲁菜','江浙菜','西北菜','东北菜','日本料理','韩国料理','西餐']
    # Use the Amap category code for restaurants: 050000
    pois = search_all('餐馆', '昌平', 100)
    all_shops.extend(pois)
    
    if len(all_shops) < 50:
        # Search more specific cuisine types
        for cuisine in cuisines:
            if len(all_shops) >= 100:
                break
            pois = search_all(cuisine, '昌平', 20)
            all_shops.extend(pois)
    
    print(f'Found {len(all_shops)} restaurant POIs')
    
    # Create shops table if not exists
    cur.execute('''
        CREATE TABLE IF NOT EXISTS shops (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            address VARCHAR(500),
            description TEXT,
            latitude DOUBLE NOT NULL,
            longitude DOUBLE NOT NULL,
            cuisine VARCHAR(50),
            avg_rating DECIMAL(3,2) DEFAULT 0,
            rating_count INT DEFAULT 0,
            popularity INT DEFAULT 0,
            congestion_level VARCHAR(20) DEFAULT "EMPTY",
            image_url VARCHAR(500),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ''')
    conn.commit()
    
    # Known dish templates per cuisine
    dishes_by_cuisine = {
        '川菜': ['宫保鸡丁','麻婆豆腐','水煮鱼','酸菜鱼','辣子鸡','毛血旺','回锅肉','夫妻肺片'],
        '湘菜': ['剁椒鱼头','小炒肉','辣椒炒肉','湘西腊肉','口味虾','红烧肉'],
        '粤菜': ['白切鸡','烧鹅','肠粉','煲仔饭','叉烧','虾饺','干炒牛河'],
        '鲁菜': ['糖醋鲤鱼','葱烧海参','九转大肠','爆炒腰花','红烧大虾'],
        '日本料理': ['寿司拼盘','日式拉面','鳗鱼饭','天妇罗','刺身','味噌汤'],
        '韩国料理': ['韩式烤肉','泡菜炒饭','石锅拌饭','大酱汤','炒年糕'],
        '西餐': ['意式披萨','牛排','意大利面','沙拉','奶油蘑菇汤'],
        '西北菜': ['羊肉泡馍','大盘鸡','牛肉拉面','烤羊排','肉夹馍'],
        '东北菜': ['锅包肉','地三鲜','猪肉炖粉条','酸菜白肉','小鸡炖蘑菇'],
    }
    default_dishes = ['招牌菜', '特色菜', '今日推荐']
    
    # Also clean existing foods table
    cur.execute('''
        CREATE TABLE IF NOT EXISTS foods (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            cuisine VARCHAR(50),
            shop_id BIGINT,
            restaurant_name VARCHAR(200),
            description TEXT,
            price_range VARCHAR(50),
            latitude DOUBLE,
            longitude DOUBLE,
            popularity INT DEFAULT 0,
            avg_rating DECIMAL(3,2) DEFAULT 0,
            rating_count INT DEFAULT 0,
            congestion_level VARCHAR(20) DEFAULT "EMPTY",
            image_url VARCHAR(500),
            spot_id BIGINT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ''')
    conn.commit()
    
    seen_shop_names = set()
    shop_count = 0
    food_count = 0
    
    for poi in all_shops:
        name = poi.get('name', '').strip()
        if not name or name.lower() in seen_shop_names:
            continue
        seen_shop_names.add(name.lower())
        
        lat, lng = extract_location(poi)
        if lat is None:
            continue
        
        address = poi.get('address', '') or ''
        typename = poi.get('type', '') or ''
        
        # Determine cuisine from type
        cuisine = '中餐'
        for c in ['川菜','湘菜','粤菜','鲁菜','日本料理','韩国料理','西餐','西北菜','东北菜']:
            if c in typename:
                cuisine = c
                break
        
        cur.execute(
            'INSERT INTO shops (name, address, description, latitude, longitude, cuisine) VALUES (%s,%s,%s,%s,%s,%s)',
            (name, address, typename, lat, lng, cuisine)
        )
        shop_id = cur.lastrowid
        shop_count += 1
        
        # Generate dishes
        dishes = dishes_by_cuisine.get(cuisine, default_dishes)
        for dish_name in dishes[:5]:  # up to 5 dishes per shop
            cur.execute(
                'INSERT INTO foods (name, cuisine, shop_id, restaurant_name, latitude, longitude, popularity) VALUES (%s,%s,%s,%s,%s,%s,%s)',
                (dish_name, cuisine, shop_id, name, lat, lng, 50)
            )
            food_count += 1
        
        if shop_count >= 60:
            break
    
    conn.commit()
    cur.close()
    conn.close()
    print(f'=== Import complete: {shop_count} shops, {food_count} foods ===')

if __name__ == '__main__':
    import_spots()
    import_facilities()  
    import_shops()
    print('\nAll done!')
