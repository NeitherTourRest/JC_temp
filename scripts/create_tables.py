import pymysql
c = pymysql.connect(host='localhost',port=3306,user='root',password='root123',database='journeycraft',charset='utf8mb4').cursor()
c.execute("CREATE TABLE IF NOT EXISTS shops (id BIGINT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(200) NOT NULL,address VARCHAR(500),description TEXT,latitude DOUBLE NOT NULL,longitude DOUBLE NOT NULL,cuisine VARCHAR(50),avg_rating DECIMAL(3,2) DEFAULT 0,rating_count INT DEFAULT 0,popularity INT DEFAULT 0,congestion_level VARCHAR(20) DEFAULT 'EMPTY',image_url VARCHAR(500),created_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4")
c.execute("CREATE TABLE IF NOT EXISTS foods (id BIGINT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(200) NOT NULL,cuisine VARCHAR(50),shop_id BIGINT,restaurant_name VARCHAR(200),description TEXT,price_range VARCHAR(50),latitude DOUBLE,longitude DOUBLE,popularity INT DEFAULT 0,avg_rating DECIMAL(3,2) DEFAULT 0,rating_count INT DEFAULT 0,congestion_level VARCHAR(20) DEFAULT 'EMPTY',image_url VARCHAR(500),spot_id BIGINT,created_at DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4")
c.close()
print('Tables created')
