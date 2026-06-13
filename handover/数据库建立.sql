-- ==============================================================
-- JourneyCraft — 数据库建立脚本
-- 包含 21 张业务表的建表语句 + 种子数据
-- 使用方法:
--   1. mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS journeycraft CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
--   2. mysql -u root -p journeycraft < "D:\JC\handover\数据库建立.sql"
--   3. python scripts/import_osm_to_mysql.py   （路网数据）
-- ==============================================================

-- ════════════════════════════════════════════════════════════════
-- 第一部分：建表（21 张）
-- ════════════════════════════════════════════════════════════════

-- 景点
CREATE TABLE IF NOT EXISTS spots (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    address VARCHAR(500),
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    popularity INT DEFAULT 0,
    avg_rating DECIMAL(3,2) DEFAULT 0.00,
    rating_count INT DEFAULT 0,
    congestion_level VARCHAR(20) DEFAULT 'EMPTY',
    image_url VARCHAR(500),
    opening_hours VARCHAR(200),
    ticket_price DECIMAL(10,2),
    created_at DATETIME,
    updated_at DATETIME,
    PRIMARY KEY (id),
    INDEX idx_category (category),
    INDEX idx_popularity (popularity),
    INDEX idx_rating (avg_rating),
    INDEX idx_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 餐馆
CREATE TABLE IF NOT EXISTS shops (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    address VARCHAR(500),
    description TEXT,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    gcj_latitude DOUBLE,
    gcj_longitude DOUBLE,
    cuisine VARCHAR(50),
    spot_id BIGINT,
    avg_rating DECIMAL(3,2) DEFAULT 0.00,
    rating_count INT DEFAULT 0,
    popularity INT DEFAULT 0,
    congestion_level VARCHAR(20) DEFAULT 'EMPTY',
    image_url VARCHAR(500),
    created_at DATETIME,
    updated_at DATETIME,
    PRIMARY KEY (id),
    INDEX idx_shop_cuisine (cuisine),
    INDEX idx_shop_popularity (popularity),
    INDEX idx_shop_rating (avg_rating),
    INDEX idx_shop_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 美食（已由 shops 替代，保留兼容）
CREATE TABLE IF NOT EXISTS foods (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    cuisine VARCHAR(50),
    restaurant_name VARCHAR(200),
    spot_id BIGINT,
    description TEXT,
    price_range VARCHAR(50),
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    popularity INT DEFAULT 0,
    avg_rating DECIMAL(3,2) DEFAULT 0.00,
    rating_count INT DEFAULT 0,
    shop_id BIGINT,
    congestion_level VARCHAR(20),
    image_url VARCHAR(500),
    created_at DATETIME,
    updated_at DATETIME,
    PRIMARY KEY (id),
    INDEX idx_cuisine (cuisine),
    INDEX idx_food_popularity (popularity),
    INDEX idx_food_rating (avg_rating),
    INDEX idx_food_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 设施
CREATE TABLE IF NOT EXISTS facilities (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    spot_id BIGINT,
    address VARCHAR(500),
    created_at DATETIME,
    updated_at DATETIME,
    PRIMARY KEY (id),
    INDEX idx_fac_category (category),
    INDEX idx_fac_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户
CREATE TABLE IF NOT EXISTS users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    nickname VARCHAR(50),
    avatar VARCHAR(500),
    role VARCHAR(20) DEFAULT 'USER',
    created_at DATETIME,
    updated_at DATETIME,
    PRIMARY KEY (id),
    UNIQUE INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户偏好
CREATE TABLE IF NOT EXISTS user_preferences (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    prefer_categories VARCHAR(500),
    prefer_cuisine VARCHAR(500),
    prefer_transport VARCHAR(50) DEFAULT 'WALK',
    created_at DATETIME,
    updated_at DATETIME,
    PRIMARY KEY (id),
    INDEX idx_up_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 景点评分
CREATE TABLE IF NOT EXISTS spot_reviews (
    id BIGINT NOT NULL AUTO_INCREMENT,
    spot_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    rating INT NOT NULL,
    comment TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    PRIMARY KEY (id),
    UNIQUE INDEX idx_spot_review_user (spot_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 餐馆评分
CREATE TABLE IF NOT EXISTS shop_reviews (
    id BIGINT NOT NULL AUTO_INCREMENT,
    shop_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    rating INT NOT NULL,
    comment TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    PRIMARY KEY (id),
    UNIQUE INDEX idx_shop_review_user (shop_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 美食评分
CREATE TABLE IF NOT EXISTS food_reviews (
    id BIGINT NOT NULL AUTO_INCREMENT,
    food_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    rating INT NOT NULL,
    comment TEXT,
    created_at DATETIME,
    updated_at DATETIME,
    PRIMARY KEY (id),
    UNIQUE INDEX idx_food_review_user (food_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 拥挤度上报
CREATE TABLE IF NOT EXISTS congestion_reports (
    id BIGINT NOT NULL AUTO_INCREMENT,
    target_type VARCHAR(10) NOT NULL COMMENT 'SPOT or FOOD',
    target_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    level VARCHAR(20) NOT NULL COMMENT 'OVERFLOWING,CROWDED,MODERATE,SPARSE,EMPTY',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_congestion_target (target_type, target_id),
    INDEX idx_congestion_time (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 收藏
CREATE TABLE IF NOT EXISTS favorites (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL COMMENT 'SPOT/FOOD/DIARY',
    target_id BIGINT NOT NULL,
    created_at DATETIME,
    PRIMARY KEY (id),
    INDEX idx_user_type (user_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 行程
CREATE TABLE IF NOT EXISTS itineraries (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    name VARCHAR(200) NOT NULL,
    route_data JSON,
    spot_ids VARCHAR(500),
    total_distance DOUBLE,
    total_time INT,
    version INT DEFAULT 3,
    created_at DATETIME,
    updated_at DATETIME,
    PRIMARY KEY (id),
    INDEX idx_itinerary_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 行程协作者
CREATE TABLE IF NOT EXISTS itinerary_collaborators (
    id BIGINT NOT NULL AUTO_INCREMENT,
    itinerary_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role VARCHAR(20) DEFAULT 'EDITOR',
    created_at DATETIME,
    PRIMARY KEY (id),
    UNIQUE INDEX idx_collab (itinerary_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 行程邀请
CREATE TABLE IF NOT EXISTS itinerary_invitations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    itinerary_id BIGINT NOT NULL,
    inviter_id BIGINT NOT NULL,
    invitee_id BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' COMMENT 'PENDING,ACCEPTED,REJECTED',
    created_at DATETIME,
    updated_at DATETIME,
    PRIMARY KEY (id),
    INDEX idx_invite_invitee (invitee_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 浏览历史
CREATE TABLE IF NOT EXISTS browse_histories (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_id BIGINT NOT NULL,
    target_name VARCHAR(200),
    created_at DATETIME,
    PRIMARY KEY (id),
    INDEX idx_browse_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 搜索历史
CREATE TABLE IF NOT EXISTS search_histories (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    keyword VARCHAR(200) NOT NULL,
    search_type VARCHAR(20),
    created_at DATETIME,
    PRIMARY KEY (id),
    INDEX idx_search_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 路线历史
CREATE TABLE IF NOT EXISTS route_histories (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    start_lat DOUBLE,
    start_lng DOUBLE,
    end_lat DOUBLE,
    end_lng DOUBLE,
    strategy VARCHAR(20),
    total_distance DOUBLE,
    created_at DATETIME,
    PRIMARY KEY (id),
    INDEX idx_route_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 设施查询历史
CREATE TABLE IF NOT EXISTS facility_query_histories (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    query_type VARCHAR(50),
    query_keyword VARCHAR(200),
    latitude DOUBLE,
    longitude DOUBLE,
    created_at DATETIME,
    PRIMARY KEY (id),
    INDEX idx_fq_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 旅游服务链接
CREATE TABLE IF NOT EXISTS travel_service_links (
    id BIGINT NOT NULL AUTO_INCREMENT,
    spot_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    url VARCHAR(500) NOT NULL,
    icon VARCHAR(50),
    created_at DATETIME,
    PRIMARY KEY (id),
    INDEX idx_tsl_spot (spot_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- OSM 路网节点
CREATE TABLE IF NOT EXISTS road_nodes (
    node_id VARCHAR(20) NOT NULL,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    PRIMARY KEY (node_id),
    INDEX idx_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- OSM 路网边
CREATE TABLE IF NOT EXISTS road_edges (
    id BIGINT NOT NULL AUTO_INCREMENT,
    edge_id VARCHAR(40) NOT NULL,
    from_node_id VARCHAR(20) NOT NULL,
    to_node_id VARCHAR(20) NOT NULL,
    distance DOUBLE DEFAULT 0,
    road_type VARCHAR(30) DEFAULT 'unknown',
    name VARCHAR(200) DEFAULT '',
    is_one_way TINYINT(1) DEFAULT 0,
    max_speed DOUBLE DEFAULT 40,
    congestion_level VARCHAR(10) DEFAULT 'LOW',
    PRIMARY KEY (id),
    INDEX idx_from (from_node_id),
    INDEX idx_to (to_node_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ════════════════════════════════════════════════════════════════
-- 第二部分：种子数据
-- ════════════════════════════════════════════════════════════════

-- 景点（20 个）
INSERT IGNORE INTO spots (name, category, description, address, latitude, longitude, popularity, avg_rating, rating_count, image_url, opening_hours, ticket_price) VALUES
('十三陵', 'HISTORIC', '明十三陵是明朝十三位皇帝的陵墓群，世界文化遗产', '北京市昌平区十三陵镇', 40.2533, 116.2186, 1500, 4.5, 328, NULL, '08:00-17:30', 60.00),
('居庸关长城', 'HISTORIC', '万里长城的重要关隘，地势险要，景色壮观', '北京市昌平区南口镇', 40.2898, 116.0681, 1200, 4.6, 256, NULL, '08:00-17:00', 40.00),
('蟒山国家森林公园', 'NATURE', '北京面积最大的国家森林公园，植被茂密', '北京市昌平区水库路', 40.2650, 116.2750, 800, 4.3, 189, NULL, '06:00-18:00', 20.00),
('温都水城', 'ENTERTAINMENT', '大型温泉度假村，集温泉、酒店、娱乐于一体', '北京市昌平区北七家镇', 40.1150, 116.4250, 950, 4.2, 201, NULL, '09:00-22:00', 168.00),
('中国航空博物馆', 'MUSEUM', '亚洲最大的航空博物馆，展示各类飞机', '北京市昌平区小汤山镇', 40.1850, 116.3600, 700, 4.4, 145, NULL, '09:00-16:30', 0.00),
('银山塔林', 'HISTORIC', '辽金时期的古塔群，国家级文物保护单位', '北京市昌平区兴寿镇', 40.3200, 116.4500, 600, 4.1, 98, NULL, '08:00-17:00', 25.00),
('沙河水库', 'NATURE', '北京近郊最大的湿地公园，观鸟胜地', '北京市昌平区沙河镇', 40.1500, 116.2900, 500, 4.0, 87, NULL, '全天开放', 0.00),
('北京航空航天大学(沙河校区)', 'SCHOOL', '北航沙河校区，现代化大学校园', '北京市昌平区沙河高教园', 40.1550, 116.2750, 400, 4.2, 65, NULL, '全天开放', 0.00),
('中央财经大学(沙河校区)', 'SCHOOL', '中财沙河校区', '北京市昌平区沙河高教园', 40.1600, 116.2800, 350, 4.0, 45, NULL, '全天开放', 0.00),
('昌平公园', 'PARK', '昌平城区中心公园，市民休闲好去处', '北京市昌平区鼓楼南街', 40.2200, 116.2300, 450, 4.0, 72, NULL, '06:00-22:00', 0.00),
('大杨山森林公园', 'NATURE', '原始森林风貌，山清水秀，适合徒步', '北京市昌平区兴寿镇', 40.3150, 116.4850, 320, 4.2, 56, NULL, '08:00-17:00', 15.00),
('白虎涧自然风景区', 'NATURE', '北京后花园，奇峰怪石', '北京市昌平区阳坊镇', 40.1350, 116.1250, 450, 4.3, 89, NULL, '08:00-18:00', 20.00),
('双龙山森林公园', 'NATURE', '森林覆盖率高，空气清新', '北京市昌平区长陵镇', 40.2950, 116.3350, 280, 4.1, 45, NULL, '08:00-17:00', 15.00),
('昌平博物馆', 'MUSEUM', '展示昌平历史文化', '北京市昌平区府学路', 40.2250, 116.2350, 350, 4.0, 62, NULL, '09:00-16:30', 0.00),
('北京后花园景区', 'NATURE', '自然风光与人文景观结合', '北京市昌平区阳坊镇', 40.1400, 116.1300, 500, 4.4, 112, NULL, '08:00-18:00', 30.00),
('昌平新城滨河公园', 'PARK', '沿河而建的生态公园', '北京市昌平区南邵镇', 40.2050, 116.2650, 380, 4.2, 78, NULL, '全天开放', 0.00),
('小汤山温泉度假村', 'ENTERTAINMENT', '温泉养生休闲胜地', '北京市昌平区小汤山镇', 40.1750, 116.3850, 600, 4.1, 156, NULL, '09:00-23:00', 128.00),
('延寿寺', 'HISTORIC', '千年古刹，环境清幽', '北京市昌平区延寿镇', 40.2850, 116.4150, 200, 4.3, 34, NULL, '08:00-17:00', 10.00),
('静之湖度假村', 'ENTERTAINMENT', '休闲度假、户外运动', '北京市昌平区兴寿镇', 40.3050, 116.4250, 420, 4.2, 88, NULL, '全天开放', 0.00),
('昌平农业嘉年华', 'ENTERTAINMENT', '农业观光体验', '北京市昌平区草莓博览园', 40.1650, 116.4050, 480, 4.0, 95, NULL, '09:00-17:00', 30.00);

-- 美食（50 个）
INSERT IGNORE INTO foods (name, cuisine, restaurant_name, spot_id, description, price_range, latitude, longitude, popularity, avg_rating, rating_count, image_url) VALUES
('昌平烤羊腿', '烧烤', '老北京烤羊腿(昌平店)', 1, '正宗炭火烤羊腿，外焦里嫩', '¥¥', 40.2540, 116.2200, 300, 4.5, 89, NULL),
('十三陵农家菜', '农家菜', '十三陵农家院', 1, '地道昌平农家菜，食材新鲜', '¥', 40.2520, 116.2190, 250, 4.3, 65, NULL),
('长城脚下咖啡', '西餐', '长城故事咖啡馆', 2, '居庸关长城脚下，风景绝佳', '¥¥', 40.2900, 116.0690, 200, 4.4, 52, NULL),
('蟒山素斋', '素食', '蟒山素食馆', 3, '森林中的素食体验', '¥', 40.2660, 116.2760, 150, 4.2, 34, NULL),
('温都自助餐', '自助', '温都水城自助餐厅', 4, '海鲜、烤肉、日料应有尽有', '¥¥¥', 40.1160, 116.4260, 350, 4.1, 78, NULL),
('清真兰州拉面', '清真', '马记兰州拉面', NULL, '正宗兰州牛肉拉面', '¥', 40.2200, 116.2300, 400, 4.4, 120, NULL),
('川味火锅', '川菜', '蜀九香火锅(昌平店)', NULL, '正宗四川麻辣火锅', '¥¥', 40.2100, 116.2400, 500, 4.3, 156, NULL),
('日料寿司', '日料', '元气寿司(昌平万科)', NULL, '新鲜手握寿司', '¥¥', 40.2150, 116.2350, 350, 4.2, 89, NULL),
('北京烤鸭', '京菜', '全聚德(昌平店)', NULL, '正宗北京烤鸭，外酥里嫩', '¥¥¥', 40.2220, 116.2320, 850, 4.5, 320, NULL),
('炸酱面', '京菜', '老北京炸酱面馆', NULL, '地道老北京炸酱面', '¥', 40.2210, 116.2330, 650, 4.3, 210, NULL),
('卤煮火烧', '京菜', '京味居', NULL, '卤煮入味，火烧软糯', '¥', 40.2180, 116.2310, 480, 4.2, 156, NULL),
('豆汁儿焦圈', '京菜', '老磁器口豆汁店', NULL, '老北京早餐标配', '¥', 40.2190, 116.2290, 300, 3.9, 89, NULL),
('涮羊肉', '京菜', '东来顺(昌平店)', NULL, '传统铜锅涮肉', '¥¥¥', 40.2230, 116.2340, 720, 4.6, 280, NULL),
('羊蝎子', '京菜', '蝎王府', NULL, '酱香浓郁，肉质鲜嫩', '¥¥', 40.2200, 116.2300, 550, 4.4, 198, NULL),
('宫保鸡丁', '川菜', '眉州东坡(昌平店)', NULL, '正宗川味宫保鸡丁', '¥¥', 40.2240, 116.2360, 620, 4.3, 234, NULL),
('麻婆豆腐', '川菜', '川味人家', NULL, '麻辣鲜香，入口即化', '¥', 40.2160, 116.2280, 410, 4.1, 134, NULL),
('水煮鱼', '川菜', '辣有道', NULL, '鱼片嫩滑，麻辣过瘾', '¥¥', 40.2250, 116.2370, 530, 4.3, 178, NULL),
('酸菜鱼', '川菜', '鱼你在一起', NULL, '酸爽开胃，鱼片鲜嫩', '¥¥', 40.2170, 116.2290, 490, 4.2, 156, NULL),
('麻辣香锅', '川菜', '麻辣诱惑', NULL, '自选食材，现做现吃', '¥¥', 40.2260, 116.2380, 460, 4.1, 145, NULL),
('毛血旺', '川菜', '川渝人家', NULL, '正宗重庆毛血旺', '¥¥', 40.2150, 116.2270, 380, 4.0, 112, NULL),
('寿司拼盘', '日料', '将太无二(昌平)', NULL, '新鲜进口三文鱼', '¥¥¥', 40.2270, 116.2390, 340, 4.4, 98, NULL),
('日式拉面', '日料', '一风堂', NULL, '浓郁猪骨汤底', '¥¥', 40.2200, 116.2310, 420, 4.2, 134, NULL),
('鳗鱼饭', '日料', '鳗步', NULL, '蒲烧鳗鱼，香甜可口', '¥¥¥', 40.2280, 116.2400, 280, 4.3, 76, NULL),
('烤肉', '日料', '牛角日式烤肉', NULL, '和牛烤肉', '¥¥¥', 40.2290, 116.2410, 390, 4.5, 112, NULL),
('糖醋排骨', '本帮菜', '上海老饭店', NULL, '酸甜可口', '¥¥', 40.2210, 116.2320, 350, 4.2, 98, NULL),
('小笼包', '本帮菜', '南翔馒头店', NULL, '皮薄馅嫩汤汁多', '¥', 40.2200, 116.2330, 520, 4.4, 189, NULL),
('生煎包', '本帮菜', '小杨生煎', NULL, '底部金黄酥脆', '¥', 40.2190, 116.2340, 480, 4.3, 167, NULL),
('红烧肉', '本帮菜', '外婆家', NULL, '肥而不腻入口即化', '¥¥', 40.2220, 116.2350, 410, 4.3, 134, NULL),
('牛肉拉面', '清真', '中国兰州牛肉拉面', NULL, '一清二白三红四绿', '¥', 40.2230, 116.2360, 650, 4.4, 256, NULL),
('羊肉泡馍', '清真', '西安饭庄', NULL, '汤醇肉烂馍香', '¥¥', 40.2240, 116.2300, 380, 4.2, 98, NULL),
('大盘鸡', '清真', '西域饭庄', NULL, '鸡肉鲜嫩土豆软糯', '¥¥', 40.2250, 116.2310, 340, 4.1, 87, NULL),
('羊肉串', '烧烤', '新疆红柳烧烤', NULL, '红柳枝烤羊肉', '¥', 40.2260, 116.2320, 580, 4.5, 234, NULL),
('烤羊排', '烧烤', '草原牧歌', NULL, '外焦里嫩，香料入味', '¥¥', 40.2270, 116.2330, 420, 4.3, 156, NULL),
('烤鱼', '烧烤', '探鱼', NULL, '活鱼现杀，多种口味', '¥¥', 40.2280, 116.2340, 490, 4.2, 167, NULL),
('韩式烤肉', '烧烤', '火炉火', NULL, '厚切五花肉', '¥¥', 40.2290, 116.2350, 510, 4.4, 178, NULL),
('海鲜烧烤', '烧烤', '蚝英雄', NULL, '生蚝扇贝无限吃', '¥¥', 40.2300, 116.2360, 460, 4.1, 145, NULL),
('重庆老火锅', '火锅', '海底捞(昌平店)', NULL, '服务好味道正宗', '¥¥¥', 40.2310, 116.2370, 890, 4.6, 345, NULL),
('四川麻辣火锅', '火锅', '小龙坎', NULL, '正宗牛油锅底', '¥¥', 40.2320, 116.2380, 680, 4.4, 267, NULL),
('潮汕牛肉火锅', '火锅', '八合里', NULL, '新鲜牛肉现切', '¥¥¥', 40.2330, 116.2390, 450, 4.5, 134, NULL),
('鱼火锅', '火锅', '新辣道', NULL, '特色鱼火锅', '¥¥', 40.2340, 116.2400, 380, 4.2, 98, NULL),
('素菜自助', '素食', '素虎素食', NULL, '健康素食自助', '¥', 40.2200, 116.2300, 320, 4.1, 89, NULL),
('素食套餐', '素食', '天厨妙香', NULL, '精致素食料理', '¥¥', 40.2210, 116.2310, 280, 4.3, 76, NULL),
('粤式早茶', '粤菜', '金鼎轩', NULL, '虾饺烧卖叉烧包', '¥¥', 40.2220, 116.2320, 560, 4.4, 234, NULL),
('烧鹅', '粤菜', '大董烤鸭店', NULL, '脆皮烧鹅', '¥¥¥', 40.2230, 116.2330, 340, 4.3, 98, NULL),
('肠粉', '粤菜', '银记肠粉', NULL, '鲜虾肠粉', '¥', 40.2240, 116.2340, 310, 4.2, 87, NULL),
('煲仔饭', '粤菜', '煲仔皇', NULL, '腊味煲仔饭', '¥', 40.2250, 116.2350, 290, 4.1, 76, NULL),
('意式披萨', '西餐', '必胜客(昌平)', NULL, '现做手工披萨', '¥¥', 40.2260, 116.2360, 380, 4.0, 112, NULL),
('牛排', '西餐', '王品牛排', NULL, '台塑牛排', '¥¥¥', 40.2270, 116.2370, 310, 4.4, 89, NULL),
('意面', '西餐', '萨莉亚', NULL, '平价意式简餐', '¥', 40.2280, 116.2380, 420, 3.9, 156, NULL),
('沙拉', '西餐', '新元素', NULL, '健康轻食沙拉', '¥¥', 40.2290, 116.2390, 260, 4.0, 67, NULL);

-- 设施（50+ 个）
INSERT IGNORE INTO facilities (name, category, latitude, longitude, spot_id) VALUES
('十三陵游客中心卫生间', 'TOILET', 40.2535, 116.2190, 1),
('居庸关停车场', 'PARKING', 40.2890, 116.0685, 2),
('蟒山游客服务中心', 'SERVICE', 40.2655, 116.2755, 3),
('温都水城超市', 'SUPERMARKET', 40.1155, 116.4255, 4),
('昌平区医院', 'HOSPITAL', 40.2200, 116.2250, NULL),
('昌平地铁站便利店', 'SUPERMARKET', 40.2190, 116.2320, NULL),
('沙河高教园餐厅', 'RESTAURANT', 40.1555, 116.2760, 8),
('十三陵停车场', 'PARKING', 40.2530, 116.2185, 1),
('十三陵游客中心', 'INFO', 40.2532, 116.2188, 1),
('十三陵卫生间', 'TOILET', 40.2538, 116.2195, 1),
('十三陵AED急救站', 'AED', 40.2533, 116.2190, 1),
('十三陵纪念品商店', 'SHOP', 40.2535, 116.2180, 1),
('居庸关停车场', 'PARKING', 40.2885, 116.0680, 2),
('居庸关卫生间', 'TOILET', 40.2895, 116.0695, 2),
('居庸关怀古台', 'INFO', 40.2890, 116.0688, 2),
('居庸关ATM', 'ATM', 40.2888, 116.0685, 2),
('蟒山停车场', 'PARKING', 40.2650, 116.2750, 3),
('蟒山卫生间', 'TOILET', 40.2665, 116.2765, 3),
('蟒山观景台商店', 'SHOP', 40.2660, 116.2760, 3),
('蟒山AED急救站', 'AED', 40.2658, 116.2758, 3),
('温都水城停车场', 'PARKING', 40.1150, 116.4250, 4),
('温都水城卫生间', 'TOILET', 40.1165, 116.4265, 4),
('温都水城咖啡厅', 'CAFE', 40.1160, 116.4260, 4),
('温都水城ATM', 'ATM', 40.1158, 116.4255, 4),
('航空博物馆停车场', 'PARKING', 40.1460, 116.3780, 5),
('航空博物馆卫生间', 'TOILET', 40.1470, 116.3790, 5),
('航空博物馆服务台', 'INFO', 40.1465, 116.3785, 5),
('银山塔林停车场', 'PARKING', 40.3300, 116.4250, 6),
('银山塔林卫生间', 'TOILET', 40.3310, 116.4260, 6),
('银山塔林小卖部', 'SHOP', 40.3305, 116.4255, 6),
('大杨山停车场', 'PARKING', 40.3145, 116.4845, 11),
('大杨山卫生间', 'TOILET', 40.3155, 116.4855, 11),
('大杨山AED急救站', 'AED', 40.3150, 116.4850, 11),
('白虎涧停车场', 'PARKING', 40.1345, 116.1245, 12),
('白虎涧卫生间', 'TOILET', 40.1355, 116.1255, 12),
('白虎涧游客中心', 'INFO', 40.1350, 116.1250, 12),
('双龙山停车场', 'PARKING', 40.2945, 116.3345, 13),
('双龙山卫生间', 'TOILET', 40.2955, 116.3355, 13),
('博物馆卫生间', 'TOILET', 40.2245, 116.2345, 14),
('博物馆服务台', 'INFO', 40.2250, 116.2350, 14),
('博物馆商店', 'SHOP', 40.2248, 116.2348, 14),
('后花园停车场', 'PARKING', 40.1395, 116.1295, 15),
('后花园卫生间', 'TOILET', 40.1405, 116.1305, 15),
('后花园咖啡厅', 'CAFE', 40.1400, 116.1300, 15),
('滨河公园停车场', 'PARKING', 40.2045, 116.2645, 16),
('滨河公园卫生间', 'TOILET', 40.2055, 116.2655, 16),
('滨河公园AED急救站', 'AED', 40.2050, 116.2650, 16),
('温泉停车场', 'PARKING', 40.1745, 116.3845, 17),
('温泉更衣室', 'SERVICE', 40.1755, 116.3855, 17),
('温泉医务室', 'HOSPITAL', 40.1750, 116.3850, 17),
('温泉咖啡厅', 'CAFE', 40.1748, 116.3848, 17),
('延寿寺停车场', 'PARKING', 40.2845, 116.4145, 18),
('延寿寺卫生间', 'TOILET', 40.2855, 116.4155, 18),
('延寿寺法物流通处', 'SHOP', 40.2850, 116.4150, 18),
('静之湖停车场', 'PARKING', 40.3045, 116.4245, 19),
('静之湖卫生间', 'TOILET', 40.3055, 116.4255, 19),
('静之湖AED急救站', 'AED', 40.3050, 116.4250, 19),
('嘉年华停车场', 'PARKING', 40.1645, 116.4045, 20),
('嘉年华卫生间', 'TOILET', 40.1655, 116.4055, 20),
('嘉年华服务台', 'INFO', 40.1650, 116.4050, 20);

-- 旅游服务链接
INSERT IGNORE INTO travel_service_links (spot_id, type, name, url, icon) VALUES
(1, 'TICKET', '十三陵门票预订', 'https://www.example.com/tickets/shisanling', 'ticket'),
(1, 'NAVIGATION', '导航到十三陵', 'https://uri.amap.com/navigation?to=116.2186,40.2533', 'navigation'),
(2, 'TICKET', '居庸关长城门票', 'https://www.example.com/tickets/juyongguan', 'ticket'),
(4, 'HOTEL', '温都水城酒店预订', 'https://www.example.com/hotel/wendu', 'hotel'),
(5, 'GUIDE', '航空博物馆导览', 'https://www.example.com/guide/aviation', 'guide');


-- ════════════════════════════════════════════════════════════════
-- 第三部分：OSM 路网数据（非 SQL 方式导入）
-- ════════════════════════════════════════════════════════════════
-- OSM 路网数据（267,094 节点 / 540,956 边）由 Python 脚本导入：
--   python scripts/import_osm_to_mysql.py
-- 该脚本从 JC/src/main/resources/data/road_network.json 读取数据。
-- 必须执行此步骤，否则导航功能不可用（后端启动时会跳过）。
-- ==============================================================
