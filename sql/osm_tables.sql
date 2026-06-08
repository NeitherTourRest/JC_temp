-- OSM路网数据MySQL表
-- 在启动时从MySQL加载到内存Graph，用于路径规划

CREATE TABLE IF NOT EXISTS road_nodes (
    node_id VARCHAR(20) PRIMARY KEY,
    latitude DOUBLE NOT NULL,
    longitude DOUBLE NOT NULL,
    INDEX idx_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS road_edges (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    edge_id VARCHAR(40) NOT NULL,
    from_node_id VARCHAR(20) NOT NULL,
    to_node_id VARCHAR(20) NOT NULL,
    distance DOUBLE DEFAULT 0,
    road_type VARCHAR(30) DEFAULT 'unknown',
    name VARCHAR(200) DEFAULT '',
    is_one_way TINYINT(1) DEFAULT 0,
    max_speed DOUBLE DEFAULT 40,
    congestion_level VARCHAR(10) DEFAULT 'LOW',
    INDEX idx_from (from_node_id),
    INDEX idx_to (to_node_id),
    FOREIGN KEY (from_node_id) REFERENCES road_nodes(node_id) ON DELETE CASCADE,
    FOREIGN KEY (to_node_id) REFERENCES road_nodes(node_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
