"""
北邮沙河校区综合实验教学楼 - 室内导航数据建模
基于典型教学楼布局建模，可根据实际平面图调整
"""
import pymongo
import json

client = pymongo.MongoClient("mongodb://localhost:27017/")
db = client["JourneyCraft"]
collection = db["indoor_navigation"]

# 清空旧数据
collection.delete_many({})

# 教学楼基本信息
building_data = {
    "buildingId": "BUPT_SHAHE_ZONGHE",
    "buildingName": "综合实验教学楼",
    "campus": "北京邮电大学沙河校区",
    "floors": ["B1", "F1", "F2", "F3", "F4", "F5"],
    "floorPlans": {
        "B1": "/pic/综合教学楼/B1.jpg",
        "F1": "/pic/综合教学楼/F1.jpg",
        "F2": "/pic/综合教学楼/F2.jpg",
        "F3": "/pic/综合教学楼/F3.jpg",
        "F4": "/pic/综合教学楼/F4.jpg",
        "F5": "/pic/综合教学楼/F5.jpg"
    }
}

# 节点定义 (基于典型教学楼布局)
# 坐标基于 800x600 像素的平面图
nodes = [
    # B1 地下室
    {"id": "B1_ENTRANCE", "floor": "B1", "x": 400, "y": 550, "name": "B1入口", "type": "ENTRANCE"},
    {"id": "B1_LAB1", "floor": "B1", "x": 200, "y": 300, "name": "B101实验室", "type": "LAB"},
    {"id": "B1_LAB2", "floor": "B1", "x": 600, "y": 300, "name": "B102实验室", "type": "LAB"},
    {"id": "B1_ELEV_W", "floor": "B1", "x": 150, "y": 400, "name": "西侧电梯", "type": "ELEVATOR"},
    {"id": "B1_ELEV_E", "floor": "B1", "x": 650, "y": 400, "name": "东侧电梯", "type": "ELEVATOR"},
    {"id": "B1_STAIR_W", "floor": "B1", "x": 100, "y": 300, "name": "西侧楼梯", "type": "STAIRS"},
    {"id": "B1_STAIR_E", "floor": "B1", "x": 700, "y": 300, "name": "东侧楼梯", "type": "STAIRS"},
    
    # F1 一楼
    {"id": "F1_ENTRANCE", "floor": "F1", "x": 400, "y": 550, "name": "大门", "type": "ENTRANCE"},
    {"id": "F1_LOBBY", "floor": "F1", "x": 400, "y": 450, "name": "大厅", "type": "LOBBY"},
    {"id": "F1_ROOM101", "floor": "F1", "x": 200, "y": 200, "name": "101教室", "type": "CLASSROOM"},
    {"id": "F1_ROOM102", "floor": "F1", "x": 300, "y": 200, "name": "102教室", "type": "CLASSROOM"},
    {"id": "F1_ROOM103", "floor": "F1", "x": 500, "y": 200, "name": "103教室", "type": "CLASSROOM"},
    {"id": "F1_ROOM104", "floor": "F1", "x": 600, "y": 200, "name": "104教室", "type": "CLASSROOM"},
    {"id": "F1_OFFICE", "floor": "F1", "x": 400, "y": 100, "name": "教务处", "type": "OFFICE"},
    {"id": "F1_TOILET_W", "floor": "F1", "x": 150, "y": 300, "name": "西侧卫生间", "type": "TOILET"},
    {"id": "F1_TOILET_E", "floor": "F1", "x": 650, "y": 300, "name": "东侧卫生间", "type": "TOILET"},
    {"id": "F1_ELEV_W", "floor": "F1", "x": 150, "y": 400, "name": "西侧电梯", "type": "ELEVATOR"},
    {"id": "F1_ELEV_E", "floor": "F1", "x": 650, "y": 400, "name": "东侧电梯", "type": "ELEVATOR"},
    {"id": "F1_STAIR_W", "floor": "F1", "x": 100, "y": 300, "name": "西侧楼梯", "type": "STAIRS"},
    {"id": "F1_STAIR_E", "floor": "F1", "x": 700, "y": 300, "name": "东侧楼梯", "type": "STAIRS"},
    
    # F2 二楼
    {"id": "F2_ROOM201", "floor": "F2", "x": 200, "y": 200, "name": "201教室", "type": "CLASSROOM"},
    {"id": "F2_ROOM202", "floor": "F2", "x": 300, "y": 200, "name": "202教室", "type": "CLASSROOM"},
    {"id": "F2_ROOM203", "floor": "F2", "x": 500, "y": 200, "name": "203教室", "type": "CLASSROOM"},
    {"id": "F2_ROOM204", "floor": "F2", "x": 600, "y": 200, "name": "204教室", "type": "CLASSROOM"},
    {"id": "F2_LAB1", "floor": "F2", "x": 200, "y": 400, "name": "205实验室", "type": "LAB"},
    {"id": "F2_LAB2", "floor": "F2", "x": 600, "y": 400, "name": "206实验室", "type": "LAB"},
    {"id": "F2_TOILET_W", "floor": "F2", "x": 150, "y": 300, "name": "西侧卫生间", "type": "TOILET"},
    {"id": "F2_TOILET_E", "floor": "F2", "x": 650, "y": 300, "name": "东侧卫生间", "type": "TOILET"},
    {"id": "F2_ELEV_W", "floor": "F2", "x": 150, "y": 400, "name": "西侧电梯", "type": "ELEVATOR"},
    {"id": "F2_ELEV_E", "floor": "F2", "x": 650, "y": 400, "name": "东侧电梯", "type": "ELEVATOR"},
    {"id": "F2_STAIR_W", "floor": "F2", "x": 100, "y": 300, "name": "西侧楼梯", "type": "STAIRS"},
    {"id": "F2_STAIR_E", "floor": "F2", "x": 700, "y": 300, "name": "东侧楼梯", "type": "STAIRS"},
    
    # F3 三楼
    {"id": "F3_ROOM301", "floor": "F3", "x": 200, "y": 200, "name": "301教室", "type": "CLASSROOM"},
    {"id": "F3_ROOM302", "floor": "F3", "x": 300, "y": 200, "name": "302教室", "type": "CLASSROOM"},
    {"id": "F3_ROOM303", "floor": "F3", "x": 500, "y": 200, "name": "303教室", "type": "CLASSROOM"},
    {"id": "F3_ROOM304", "floor": "F3", "x": 600, "y": 200, "name": "304教室", "type": "CLASSROOM"},
    {"id": "F3_LAB1", "floor": "F3", "x": 200, "y": 400, "name": "305实验室", "type": "LAB"},
    {"id": "F3_LAB2", "floor": "F3", "x": 600, "y": 400, "name": "306实验室", "type": "LAB"},
    {"id": "F3_TOILET_W", "floor": "F3", "x": 150, "y": 300, "name": "西侧卫生间", "type": "TOILET"},
    {"id": "F3_TOILET_E", "floor": "F3", "x": 650, "y": 300, "name": "东侧卫生间", "type": "TOILET"},
    {"id": "F3_ELEV_W", "floor": "F3", "x": 150, "y": 400, "name": "西侧电梯", "type": "ELEVATOR"},
    {"id": "F3_ELEV_E", "floor": "F3", "x": 650, "y": 400, "name": "东侧电梯", "type": "ELEVATOR"},
    {"id": "F3_STAIR_W", "floor": "F3", "x": 100, "y": 300, "name": "西侧楼梯", "type": "STAIRS"},
    {"id": "F3_STAIR_E", "floor": "F3", "x": 700, "y": 300, "name": "东侧楼梯", "type": "STAIRS"},
    
    # F4 四楼
    {"id": "F4_ROOM401", "floor": "F4", "x": 200, "y": 200, "name": "401教室", "type": "CLASSROOM"},
    {"id": "F4_ROOM402", "floor": "F4", "x": 300, "y": 200, "name": "402教室", "type": "CLASSROOM"},
    {"id": "F4_ROOM403", "floor": "F4", "x": 500, "y": 200, "name": "403教室", "type": "CLASSROOM"},
    {"id": "F4_ROOM404", "floor": "F4", "x": 600, "y": 200, "name": "404教室", "type": "CLASSROOM"},
    {"id": "F4_LAB1", "floor": "F4", "x": 200, "y": 400, "name": "405实验室", "type": "LAB"},
    {"id": "F4_LAB2", "floor": "F4", "x": 600, "y": 400, "name": "406实验室", "type": "LAB"},
    {"id": "F4_TOILET_W", "floor": "F4", "x": 150, "y": 300, "name": "西侧卫生间", "type": "TOILET"},
    {"id": "F4_TOILET_E", "floor": "F4", "x": 650, "y": 300, "name": "东侧卫生间", "type": "TOILET"},
    {"id": "F4_ELEV_W", "floor": "F4", "x": 150, "y": 400, "name": "西侧电梯", "type": "ELEVATOR"},
    {"id": "F4_ELEV_E", "floor": "F4", "x": 650, "y": 400, "name": "东侧电梯", "type": "ELEVATOR"},
    {"id": "F4_STAIR_W", "floor": "F4", "x": 100, "y": 300, "name": "西侧楼梯", "type": "STAIRS"},
    {"id": "F4_STAIR_E", "floor": "F4", "x": 700, "y": 300, "name": "东侧楼梯", "type": "STAIRS"},
    
    # F5 五楼
    {"id": "F5_ROOM501", "floor": "F5", "x": 200, "y": 200, "name": "501教室", "type": "CLASSROOM"},
    {"id": "F5_ROOM502", "floor": "F5", "x": 300, "y": 200, "name": "502教室", "type": "CLASSROOM"},
    {"id": "F5_ROOM503", "floor": "F5", "x": 500, "y": 200, "name": "503教室", "type": "CLASSROOM"},
    {"id": "F5_ROOM504", "floor": "F5", "x": 600, "y": 200, "name": "504教室", "type": "CLASSROOM"},
    {"id": "F5_LAB1", "floor": "F5", "x": 200, "y": 400, "name": "505实验室", "type": "LAB"},
    {"id": "F5_LAB2", "floor": "F5", "x": 600, "y": 400, "name": "506实验室", "type": "LAB"},
    {"id": "F5_TOILET_W", "floor": "F5", "x": 150, "y": 300, "name": "西侧卫生间", "type": "TOILET"},
    {"id": "F5_TOILET_E", "floor": "F5", "x": 650, "y": 300, "name": "东侧卫生间", "type": "TOILET"},
    {"id": "F5_ELEV_W", "floor": "F5", "x": 150, "y": 400, "name": "西侧电梯", "type": "ELEVATOR"},
    {"id": "F5_ELEV_E", "floor": "F5", "x": 650, "y": 400, "name": "东侧电梯", "type": "ELEVATOR"},
    {"id": "F5_STAIR_W", "floor": "F5", "x": 100, "y": 300, "name": "西侧楼梯", "type": "STAIRS"},
    {"id": "F5_STAIR_E", "floor": "F5", "x": 700, "y": 300, "name": "东侧楼梯", "type": "STAIRS"},
]

# 同层边 (走廊连接)
edges = []

# 为每层生成走廊连接
for floor in ["B1", "F1", "F2", "F3", "F4", "F5"]:
    prefix = floor
    
    # 走廊主连接 (假设走廊在y=300附近)
    if floor == "F1":
        # F1特殊：入口→大厅→各房间
        edges.extend([
            {"from": f"{prefix}_ENTRANCE", "to": f"{prefix}_LOBBY", "dist": 100, "floor": floor},
            {"from": f"{prefix}_LOBBY", "to": f"{prefix}_ROOM101", "dist": 150, "floor": floor},
            {"from": f"{prefix}_LOBBY", "to": f"{prefix}_ROOM102", "dist": 100, "floor": floor},
            {"from": f"{prefix}_LOBBY", "to": f"{prefix}_ROOM103", "dist": 100, "floor": floor},
            {"from": f"{prefix}_LOBBY", "to": f"{prefix}_ROOM104", "dist": 150, "floor": floor},
            {"from": f"{prefix}_LOBBY", "to": f"{prefix}_OFFICE", "dist": 200, "floor": floor},
            {"from": f"{prefix}_LOBBY", "to": f"{prefix}_TOILET_W", "dist": 150, "floor": floor},
            {"from": f"{prefix}_LOBBY", "to": f"{prefix}_TOILET_E", "dist": 150, "floor": floor},
            {"from": f"{prefix}_LOBBY", "to": f"{prefix}_ELEV_W", "dist": 150, "floor": floor},
            {"from": f"{prefix}_LOBBY", "to": f"{prefix}_ELEV_E", "dist": 150, "floor": floor},
            {"from": f"{prefix}_LOBBY", "to": f"{prefix}_STAIR_W", "dist": 200, "floor": floor},
            {"from": f"{prefix}_LOBBY", "to": f"{prefix}_STAIR_E", "dist": 200, "floor": floor},
        ])
    else:
        # 其他楼层：走廊连接各房间
        rooms = [f"{prefix}_ROOM{floor[1:]}01", f"{prefix}_ROOM{floor[1:]}02", 
                 f"{prefix}_ROOM{floor[1:]}03", f"{prefix}_ROOM{floor[1:]}04"]
        labs = [f"{prefix}_LAB1", f"{prefix}_LAB2"]
        
        # 走廊连接 (假设走廊在中间)
        for room in rooms:
            edges.append({"from": f"{prefix}_CORRIDOR", "to": room, "dist": 80, "floor": floor})
        for lab in labs:
            edges.append({"from": f"{prefix}_CORRIDOR", "to": lab, "dist": 100, "floor": floor})
        
        # 走廊连接设施
        edges.extend([
            {"from": f"{prefix}_CORRIDOR", "to": f"{prefix}_TOILET_W", "dist": 100, "floor": floor},
            {"from": f"{prefix}_CORRIDOR", "to": f"{prefix}_TOILET_E", "dist": 100, "floor": floor},
            {"from": f"{prefix}_CORRIDOR", "to": f"{prefix}_ELEV_W", "dist": 80, "floor": floor},
            {"from": f"{prefix}_CORRIDOR", "to": f"{prefix}_ELEV_E", "dist": 80, "floor": floor},
            {"from": f"{prefix}_CORRIDOR", "to": f"{prefix}_STAIR_W", "dist": 120, "floor": floor},
            {"from": f"{prefix}_CORRIDOR", "to": f"{prefix}_STAIR_E", "dist": 120, "floor": floor},
        ])
        
        # 添加走廊节点
        nodes.append({"id": f"{prefix}_CORRIDOR", "floor": floor, "x": 400, "y": 300, "name": f"{floor}走廊", "type": "CORRIDOR"})

# 跨层连接 (电梯和楼梯)
cross_floor_edges = []
for i in range(len(building_data["floors"]) - 1):
    floor1 = building_data["floors"][i]
    floor2 = building_data["floors"][i + 1]
    
    # 电梯连接 (快速)
    cross_floor_edges.extend([
        {"from": f"{floor1}_ELEV_W", "to": f"{floor2}_ELEV_W", "type": "ELEVATOR", "dist": 10},
        {"from": f"{floor1}_ELEV_E", "to": f"{floor2}_ELEV_E", "type": "ELEVATOR", "dist": 10},
        # 楼梯连接 (慢)
        {"from": f"{floor1}_STAIR_W", "to": f"{floor2}_STAIR_W", "type": "STAIRS", "dist": 30},
        {"from": f"{floor1}_STAIR_E", "to": f"{floor2}_STAIR_E", "type": "STAIRS", "dist": 30},
    ])

# 存储到MongoDB
document = {
    **building_data,
    "nodes": nodes,
    "edges": edges,
    "crossFloorEdges": cross_floor_edges
}

collection.insert_one(document)

print(f"[OK] Indoor navigation data imported to MongoDB")
print(f"  - Building: {building_data['buildingName']}")
print(f"  - Floors: {', '.join(building_data['floors'])}")
print(f"  - Nodes: {len(nodes)}")
print(f"  - Same-floor edges: {len(edges)}")
print(f"  - Cross-floor edges: {len(cross_floor_edges)}")
print(f"\nSample rooms:")
for node in nodes[:10]:
    print(f"  - {node['name']} ({node['type']}) @ {node['floor']}")
