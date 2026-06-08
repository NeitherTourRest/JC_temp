#!/usr/bin/env python3
"""Import parsed OSM road network JSON into MySQL."""
import json, os, pymysql

# MySQL config
DB_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "root123",
    "database": "journeycraft",
    "charset": "utf8mb4"
}

JSON_PATH = os.path.join(os.path.dirname(__file__), "..", "JC", "src", "main", "resources", "data", "road_network.json")

def main():
    print(f"Reading {JSON_PATH}...")
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    conn = pymysql.connect(**DB_CONFIG)
    cur = conn.cursor()

    # Clear existing data
    cur.execute("DELETE FROM road_edges")
    cur.execute("DELETE FROM road_nodes")

    # Insert nodes in batches
    nodes = data["nodes"]
    print(f"Importing {len(nodes)} nodes...")
    node_sql = "INSERT INTO road_nodes (node_id, latitude, longitude) VALUES (%s, %s, %s)"
    batch = []
    for nid, loc in nodes.items():
        batch.append((nid, loc["lat"], loc["lng"]))
        if len(batch) >= 1000:
            cur.executemany(node_sql, batch)
            batch = []
    if batch:
        cur.executemany(node_sql, batch)
    conn.commit()
    print(f"  {len(nodes)} nodes imported")

    # Insert edges
    edges = data["edges"]
    print(f"Importing {len(edges)} edges...")
    edge_sql = """INSERT INTO road_edges (edge_id, from_node_id, to_node_id, distance, road_type, name, is_one_way, max_speed)
                  VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""
    batch = []
    for e in edges:
        f, t = e["from"], e["to"]
        fn, tn = nodes.get(f), nodes.get(t)
        dist = 0
        if fn and tn:
            from math import radians, sin, cos, sqrt, atan2
            R = 6371000
            dlat = radians(tn["lat"] - fn["lat"])
            dlng = radians(tn["lng"] - fn["lng"])
            a = sin(dlat/2)**2 + cos(radians(fn["lat"])) * cos(radians(tn["lat"])) * sin(dlng/2)**2
            dist = R * 2 * atan2(sqrt(a), sqrt(1-a))
        name = e.get("name", "")
        batch.append((
            f"{f}_{t}", f, t,
            round(dist, 1) if dist > 0 else 100,
            e.get("roadType", "unknown"),
            name if name else "",
            1 if e.get("isOneWay", False) else 0,
            e.get("maxSpeed", 40)
        ))
        if len(batch) >= 1000:
            cur.executemany(edge_sql, batch)
            batch = []
    if batch:
        cur.executemany(edge_sql, batch)
    conn.commit()
    print(f"  {len(edges)} edges imported")

    cur.close()
    conn.close()
    print("Done!")
    print(f"Total: {len(nodes)} nodes, {len(edges)} edges")

if __name__ == "__main__":
    main()
