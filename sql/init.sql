-- JourneyCraft Seed Data for Changping District

-- Congestion reports for spots (time-weighted)
CREATE TABLE IF NOT EXISTS congestion_reports (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    spot_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    level VARCHAR(20) NOT NULL COMMENT 'OVERFLOWING, CROWDED, MODERATE, SPARSE, EMPTY',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_congestion_spot (spot_id),
    INDEX idx_congestion_time (created_at)
);

-- Insert sample scenic spots
INSERT INTO spots (name, category, description, address, latitude, longitude, popularity, avg_rating, rating_count, image_url, opening_hours, ticket_price) VALUES
('十三陵', 'HISTORIC', '明十三陵是明朝十三位皇帝的陵墓群，世界文化遗产', '北京市昌平区十三陵镇', 40.2533, 116.2186, 1500, 4.5, 328, NULL, '08:00-17:30', 60.00),
('居庸关长城', 'HISTORIC', '万里长城的重要关隘，地势险要，景色壮观', '北京市昌平区南口镇', 40.2898, 116.0681, 1200, 4.6, 256, NULL, '08:00-17:00', 40.00),
('蟒山国家森林公园', 'NATURE', '北京面积最大的国家森林公园，植被茂密', '北京市昌平区水库路', 40.2650, 116.2750, 800, 4.3, 189, NULL, '06:00-18:00', 20.00),
('温都水城', 'ENTERTAINMENT', '大型温泉度假村，集温泉、酒店、娱乐于一体', '北京市昌平区北七家镇', 40.1150, 116.4250, 950, 4.2, 201, NULL, '09:00-22:00', 168.00),
('中国航空博物馆', 'MUSEUM', '亚洲最大的航空博物馆，展示各类飞机', '北京市昌平区小汤山镇', 40.1850, 116.3600, 700, 4.4, 145, NULL, '09:00-16:30', 0.00),
('银山塔林', 'HISTORIC', '辽金时期的古塔群，国家级文物保护单位', '北京市昌平区兴寿镇', 40.3200, 116.4500, 600, 4.1, 98, NULL, '08:00-17:00', 25.00),
('沙河水库', 'NATURE', '北京近郊最大的湿地公园，观鸟胜地', '北京市昌平区沙河镇', 40.1500, 116.2900, 500, 4.0, 87, NULL, '全天开放', 0.00),
('北京航空航天大学(沙河校区)', 'SCHOOL', '北航沙河校区，现代化大学校园', '北京市昌平区沙河高教园', 40.1550, 116.2750, 400, 4.2, 65, NULL, '全天开放', 0.00),
('中央财经大学(沙河校区)', 'SCHOOL', '中财沙河校区', '北京市昌平区沙河高教园', 40.1600, 116.2800, 350, 4.0, 45, NULL, '全天开放', 0.00),
('昌平公园', 'PARK', '昌平城区中心公园，市民休闲好去处', '北京市昌平区鼓楼南街', 40.2200, 116.2300, 450, 4.0, 72, NULL, '06:00-22:00', 0.00);

-- Insert foods
INSERT INTO foods (name, cuisine, restaurant_name, spot_id, description, price_range, latitude, longitude, popularity, avg_rating, rating_count, image_url) VALUES
('昌平烤羊腿', '烧烤', '老北京烤羊腿(昌平店)', 1, '正宗炭火烤羊腿，外焦里嫩', '¥¥', 40.2540, 116.2200, 300, 4.5, 89, NULL),
('十三陵农家菜', '农家菜', '十三陵农家院', 1, '地道昌平农家菜，食材新鲜', '¥', 40.2520, 116.2190, 250, 4.3, 65, NULL),
('长城脚下咖啡', '西餐', '长城故事咖啡馆', 2, '居庸关长城脚下，风景绝佳', '¥¥', 40.2900, 116.0690, 200, 4.4, 52, NULL),
('蟒山素斋', '素食', '蟒山素食馆', 3, '森林中的素食体验', '¥', 40.2660, 116.2760, 150, 4.2, 34, NULL),
('温都自助餐', '自助', '温都水城自助餐厅', 4, '海鲜、烤肉、日料应有尽有', '¥¥¥', 40.1160, 116.4260, 350, 4.1, 78, NULL),
('清真兰州拉面', '清真', '马记兰州拉面', NULL, '正宗兰州牛肉拉面', '¥', 40.2200, 116.2300, 400, 4.4, 120, NULL),
('川味火锅', '川菜', '蜀九香火锅(昌平店)', NULL, '正宗四川麻辣火锅', '¥¥', 40.2100, 116.2400, 500, 4.3, 156, NULL),
('日料寿司', '日料', '元气寿司(昌平万科)', NULL, '新鲜手握寿司', '¥¥', 40.2150, 116.2350, 350, 4.2, 89, NULL);

-- Insert facilities
INSERT INTO facilities (name, category, latitude, longitude, spot_id) VALUES
('十三陵游客中心卫生间', 'TOILET', 40.2535, 116.2190, 1),
('居庸关停车场', 'PARKING', 40.2890, 116.0685, 2),
('蟒山游客服务中心', 'SERVICE', 40.2655, 116.2755, 3),
('温都水城超市', 'SUPERMARKET', 40.1155, 116.4255, 4),
('昌平区医院', 'HOSPITAL', 40.2200, 116.2250, NULL),
('昌平地铁站便利店', 'SUPERMARKET', 40.2190, 116.2320, NULL),
('沙河高教园餐厅', 'RESTAURANT', 40.1555, 116.2760, 8);

-- Insert travel service links
INSERT INTO travel_service_links (spot_id, type, name, url, icon) VALUES
(1, 'TICKET', '十三陵门票预订', 'https://www.example.com/tickets/shisanling', 'ticket'),
(1, 'NAVIGATION', '导航到十三陵', 'https://uri.amap.com/navigation?to=116.2186,40.2533', 'navigation'),
(2, 'TICKET', '居庸关长城门票', 'https://www.example.com/tickets/juyongguan', 'ticket'),
(4, 'HOTEL', '温都水城酒店预订', 'https://www.example.com/hotel/wendu', 'hotel'),
(5, 'GUIDE', '航空博物馆导览', 'https://www.example.com/guide/aviation', 'guide');
