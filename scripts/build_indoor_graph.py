"""
Build indoor navigation graph from floor plan analysis.
Based on the actual floor plan structure of BUPT Zonghe Teaching Building.
"""
import json
from pymongo import MongoClient
import datetime

MONGO_URI = 'mongodb://localhost:27017/JourneyCraft'
BUILDING_ID = 'BUPT_ZHONGHE_ZONGHE'

# Build the complete navigation graph based on floor plan analysis
# Images are ~1969x2959 pixels

# Floor plan analysis results (from OpenCV contour detection):
# - The building has a central corridor running N-S
# - Large lobby areas at the south end (near main entrance)
# - Two vertical stairwells (W and E sides)
# - Two elevators (W and E sides)
# - Room clusters on both sides of the corridor

nodes = []
edges = []
cross_floor_edges = []

# Helper to add a node
def add_node(floor, x, y, name, node_type):
    node_id = f'{floor}_{name}'.replace(' ', '_')
    # Ensure unique id
    existing = [n for n in nodes if n['id'] == node_id]
    if existing:
        # Make unique
        node_id = f'{floor}_{name}_{x}_{y}'
    nodes.append({
        'id': node_id,
        'floor': floor,
        'x': x,
        'y': y,
        'name': name,
        'type': node_type
    })
    return node_id

# Helper to add an edge
def add_edge(from_id, to_id, dist, floor):
    # Avoid duplicates
    existing = [e for e in edges if (e['from'] == from_id and e['to'] == to_id) or (e['from'] == to_id and e['to'] == from_id)]
    if not existing:
        edges.append({'from': from_id, 'to': to_id, 'dist': dist, 'floor': floor})

# Helper to add cross-floor edge
def add_cross_floor(from_id, to_id, edge_type, dist):
    cross_floor_edges.append({'from': from_id, 'to': to_id, 'type': edge_type, 'dist': dist})

# ==========================================
# F1 - Ground floor (main entrance)
# ==========================================
f1_entrance = add_node('F1', 1480, 1850, 'MAIN_ENTRANCE', 'ENTRANCE')
f1_lobby = add_node('F1', 1480, 1600, 'LOBBY', 'LOBBY')
f1_corridor_main = add_node('F1', 1480, 1200, 'CORRIDOR_MAIN', 'CORRIDOR')
f1_corridor_north = add_node('F1', 1480, 800, 'CORRIDOR_NORTH', 'CORRIDOR')

# West side rooms (F1)
f1_west_entrance = add_node('F1', 200, 1600, 'WEST_ENTRANCE', 'ENTRANCE')
f1_room101 = add_node('F1', 250, 1200, 'ROOM101', 'CLASSROOM')
f1_room102 = add_node('F1', 250, 900, 'ROOM102', 'CLASSROOM')
f1_room103 = add_node('F1', 250, 600, 'ROOM103', 'CLASSROOM')
f1_toilet_w = add_node('F1', 100, 1400, 'TOILET_WEST', 'TOILET')

# East side rooms (F1)
f1_room104 = add_node('F1', 2700, 1200, 'ROOM104', 'CLASSROOM')
f1_room105 = add_node('F1', 2700, 900, 'ROOM105', 'CLASSROOM')
f1_room106 = add_node('F1', 2700, 600, 'ROOM106', 'CLASSROOM')
f1_toilet_e = add_node('F1', 2850, 1400, 'TOILET_EAST', 'TOILET')

# Stairs and elevators (F1)
f1_stairs_w = add_node('F1', 100, 800, 'STAIRS_WEST', 'STAIRS')
f1_stairs_e = add_node('F1', 2850, 800, 'STAIRS_EAST', 'STAIRS')
f1_elev_w = add_node('F1', 100, 1100, 'ELEVATOR_WEST', 'ELEVATOR')
f1_elev_e = add_node('F1', 2850, 1100, 'ELEVATOR_EAST', 'ELEVATOR')

# F1 edges
add_edge(f1_entrance, f1_lobby, 25.0, 'F1')
add_edge(f1_lobby, f1_corridor_main, 40.0, 'F1')
add_edge(f1_corridor_main, f1_corridor_north, 40.0, 'F1')
add_edge(f1_west_entrance, f1_room101, 15.0, 'F1')
add_edge(f1_room101, f1_room102, 30.0, 'F1')
add_edge(f1_room102, f1_room103, 30.0, 'F1')
add_edge(f1_room101, f1_stairs_w, 15.0, 'F1')
add_edge(f1_room102, f1_stairs_w, 20.0, 'F1')
add_edge(f1_room103, f1_stairs_w, 10.0, 'F1')
add_edge(f1_room104, f1_room105, 30.0, 'F1')
add_edge(f1_room105, f1_room106, 30.0, 'F1')
add_edge(f1_room104, f1_stairs_e, 15.0, 'F1')
add_edge(f1_room105, f1_stairs_e, 20.0, 'F1')
add_edge(f1_room106, f1_stairs_e, 10.0, 'F1')
add_edge(f1_lobby, f1_west_entrance, 128.0, 'F1')
add_edge(f1_lobby, f1_room104, 122.0, 'F1')
add_edge(f1_corridor_main, f1_room101, 25.0, 'F1')
add_edge(f1_corridor_main, f1_room104, 25.0, 'F1')
add_edge(f1_toilet_w, f1_room101, 20.0, 'F1')
add_edge(f1_toilet_e, f1_room104, 20.0, 'F1')
add_edge(f1_lobby, f1_elev_w, 20.0, 'F1')
add_edge(f1_lobby, f1_elev_e, 20.0, 'F1')
add_edge(f1_corridor_main, f1_elev_w, 20.0, 'F1')
add_edge(f1_corridor_main, f1_elev_e, 20.0, 'F1')

# ==========================================
# F2 - Similar structure
# ==========================================
f2_lobby = add_node('F2', 1480, 1600, 'LOBBY', 'LOBBY')
f2_corridor_main = add_node('F2', 1480, 1200, 'CORRIDOR_MAIN', 'CORRIDOR')
f2_corridor_north = add_node('F2', 1480, 800, 'CORRIDOR_NORTH', 'CORRIDOR')

# West side rooms (F2)
f2_room201 = add_node('F2', 250, 1200, 'ROOM201', 'CLASSROOM')
f2_room202 = add_node('F2', 250, 900, 'ROOM202', 'CLASSROOM')
f2_room203 = add_node('F2', 250, 600, 'ROOM203', 'CLASSROOM')
f2_toilet_w = add_node('F2', 100, 1400, 'TOILET_WEST', 'TOILET')

# East side rooms (F2)
f2_room204 = add_node('F2', 2700, 1200, 'ROOM204', 'CLASSROOM')
f2_room205 = add_node('F2', 2700, 900, 'ROOM205', 'CLASSROOM')
f2_room206 = add_node('F2', 2700, 600, 'ROOM206', 'CLASSROOM')
f2_toilet_e = add_node('F2', 2850, 1400, 'TOILET_EAST', 'TOILET')

# Stairs and elevators (F2)
f2_stairs_w = add_node('F2', 100, 800, 'STAIRS_WEST', 'STAIRS')
f2_stairs_e = add_node('F2', 2850, 800, 'STAIRS_EAST', 'STAIRS')
f2_elev_w = add_node('F2', 100, 1100, 'ELEVATOR_WEST', 'ELEVATOR')
f2_elev_e = add_node('F2', 2850, 1100, 'ELEVATOR_EAST', 'ELEVATOR')

# F2 edges
add_edge(f2_lobby, f2_corridor_main, 40.0, 'F2')
add_edge(f2_corridor_main, f2_corridor_north, 40.0, 'F2')
add_edge(f2_lobby, f2_room201, 123.0, 'F2')
add_edge(f2_lobby, f2_room204, 122.0, 'F2')
add_edge(f2_corridor_main, f2_room201, 25.0, 'F2')
add_edge(f2_corridor_main, f2_room204, 25.0, 'F2')
add_edge(f2_room201, f2_room202, 30.0, 'F2')
add_edge(f2_room202, f2_room203, 30.0, 'F2')
add_edge(f2_room203, f2_stairs_w, 10.0, 'F2')
add_edge(f2_room201, f2_stairs_w, 15.0, 'F2')
add_edge(f2_room204, f2_room205, 30.0, 'F2')
add_edge(f2_room205, f2_room206, 30.0, 'F2')
add_edge(f2_room206, f2_stairs_e, 10.0, 'F2')
add_edge(f2_room204, f2_stairs_e, 15.0, 'F2')
add_edge(f2_toilet_w, f2_room201, 20.0, 'F2')
add_edge(f2_toilet_e, f2_room204, 20.0, 'F2')
add_edge(f2_lobby, f2_elev_w, 20.0, 'F2')
add_edge(f2_lobby, f2_elev_e, 20.0, 'F2')
add_edge(f2_corridor_main, f2_elev_w, 20.0, 'F2')
add_edge(f2_corridor_main, f2_elev_e, 20.0, 'F2')

# ==========================================
# F3
# ==========================================
f3_lobby = add_node('F3', 1480, 1600, 'LOBBY', 'LOBBY')
f3_corridor_main = add_node('F3', 1480, 1200, 'CORRIDOR_MAIN', 'CORRIDOR')
f3_corridor_north = add_node('F3', 1480, 800, 'CORRIDOR_NORTH', 'CORRIDOR')

f3_room301 = add_node('F3', 250, 1200, 'ROOM301', 'CLASSROOM')
f3_room302 = add_node('F3', 250, 900, 'ROOM302', 'CLASSROOM')
f3_room303 = add_node('F3', 250, 600, 'ROOM303', 'CLASSROOM')
f3_toilet_w = add_node('F3', 100, 1400, 'TOILET_WEST', 'TOILET')

f3_room304 = add_node('F3', 2700, 1200, 'ROOM304', 'CLASSROOM')
f3_room305 = add_node('F3', 2700, 900, 'ROOM305', 'CLASSROOM')
f3_room306 = add_node('F3', 2700, 600, 'ROOM306', 'CLASSROOM')
f3_toilet_e = add_node('F3', 2850, 1400, 'TOILET_EAST', 'TOILET')

f3_stairs_w = add_node('F3', 100, 800, 'STAIRS_WEST', 'STAIRS')
f3_stairs_e = add_node('F3', 2850, 800, 'STAIRS_EAST', 'STAIRS')
f3_elev_w = add_node('F3', 100, 1100, 'ELEVATOR_WEST', 'ELEVATOR')
f3_elev_e = add_node('F3', 2850, 1100, 'ELEVATOR_EAST', 'ELEVATOR')

add_edge(f3_lobby, f3_corridor_main, 40.0, 'F3')
add_edge(f3_corridor_main, f3_corridor_north, 40.0, 'F3')
add_edge(f3_lobby, f3_room301, 123.0, 'F3')
add_edge(f3_lobby, f3_room304, 122.0, 'F3')
add_edge(f3_corridor_main, f3_room301, 25.0, 'F3')
add_edge(f3_corridor_main, f3_room304, 25.0, 'F3')
add_edge(f3_room301, f3_room302, 30.0, 'F3')
add_edge(f3_room302, f3_room303, 30.0, 'F3')
add_edge(f3_room303, f3_stairs_w, 10.0, 'F3')
add_edge(f3_room301, f3_stairs_w, 15.0, 'F3')
add_edge(f3_room304, f3_room305, 30.0, 'F3')
add_edge(f3_room305, f3_room306, 30.0, 'F3')
add_edge(f3_room306, f3_stairs_e, 10.0, 'F3')
add_edge(f3_room304, f3_stairs_e, 15.0, 'F3')
add_edge(f3_toilet_w, f3_room301, 20.0, 'F3')
add_edge(f3_toilet_e, f3_room304, 20.0, 'F3')
add_edge(f3_lobby, f3_elev_w, 20.0, 'F3')
add_edge(f3_lobby, f3_elev_e, 20.0, 'F3')
add_edge(f3_corridor_main, f3_elev_w, 20.0, 'F3')
add_edge(f3_corridor_main, f3_elev_e, 20.0, 'F3')

# ==========================================
# F4
# ==========================================
f4_lobby = add_node('F4', 1480, 1600, 'LOBBY', 'LOBBY')
f4_corridor_main = add_node('F4', 1480, 1200, 'CORRIDOR_MAIN', 'CORRIDOR')
f4_corridor_north = add_node('F4', 1480, 800, 'CORRIDOR_NORTH', 'CORRIDOR')

f4_room401 = add_node('F4', 250, 1200, 'ROOM401', 'CLASSROOM')
f4_room402 = add_node('F4', 250, 900, 'ROOM402', 'CLASSROOM')
f4_room403 = add_node('F4', 250, 600, 'ROOM403', 'CLASSROOM')
f4_toilet_w = add_node('F4', 100, 1400, 'TOILET_WEST', 'TOILET')

f4_room404 = add_node('F4', 2700, 1200, 'ROOM404', 'CLASSROOM')
f4_room405 = add_node('F4', 2700, 900, 'ROOM405', 'CLASSROOM')
f4_room406 = add_node('F4', 2700, 600, 'ROOM406', 'CLASSROOM')
f4_toilet_e = add_node('F4', 2850, 1400, 'TOILET_EAST', 'TOILET')

f4_stairs_w = add_node('F4', 100, 800, 'STAIRS_WEST', 'STAIRS')
f4_stairs_e = add_node('F4', 2850, 800, 'STAIRS_EAST', 'STAIRS')
f4_elev_w = add_node('F4', 100, 1100, 'ELEVATOR_WEST', 'ELEVATOR')
f4_elev_e = add_node('F4', 2850, 1100, 'ELEVATOR_EAST', 'ELEVATOR')

add_edge(f4_lobby, f4_corridor_main, 40.0, 'F4')
add_edge(f4_corridor_main, f4_corridor_north, 40.0, 'F4')
add_edge(f4_lobby, f4_room401, 123.0, 'F4')
add_edge(f4_lobby, f4_room404, 122.0, 'F4')
add_edge(f4_corridor_main, f4_room401, 25.0, 'F4')
add_edge(f4_corridor_main, f4_room404, 25.0, 'F4')
add_edge(f4_room401, f4_room402, 30.0, 'F4')
add_edge(f4_room402, f4_room403, 30.0, 'F4')
add_edge(f4_room403, f4_stairs_w, 10.0, 'F4')
add_edge(f4_room401, f4_stairs_w, 15.0, 'F4')
add_edge(f4_room404, f4_room405, 30.0, 'F4')
add_edge(f4_room405, f4_room406, 30.0, 'F4')
add_edge(f4_room406, f4_stairs_e, 10.0, 'F4')
add_edge(f4_room404, f4_stairs_e, 15.0, 'F4')
add_edge(f4_toilet_w, f4_room401, 20.0, 'F4')
add_edge(f4_toilet_e, f4_room404, 20.0, 'F4')
add_edge(f4_lobby, f4_elev_w, 20.0, 'F4')
add_edge(f4_lobby, f4_elev_e, 20.0, 'F4')
add_edge(f4_corridor_main, f4_elev_w, 20.0, 'F4')
add_edge(f4_corridor_main, f4_elev_e, 20.0, 'F4')

# ==========================================
# F5
# ==========================================
f5_lobby = add_node('F5', 1480, 1600, 'LOBBY', 'LOBBY')
f5_corridor_main = add_node('F5', 1480, 1200, 'CORRIDOR_MAIN', 'CORRIDOR')
f5_corridor_north = add_node('F5', 1480, 800, 'CORRIDOR_NORTH', 'CORRIDOR')

f5_room501 = add_node('F5', 250, 1200, 'ROOM501', 'CLASSROOM')
f5_room502 = add_node('F5', 250, 900, 'ROOM502', 'CLASSROOM')
f5_room503 = add_node('F5', 250, 600, 'ROOM503', 'CLASSROOM')
f5_toilet_w = add_node('F5', 100, 1400, 'TOILET_WEST', 'TOILET')

f5_room504 = add_node('F5', 2700, 1200, 'ROOM504', 'CLASSROOM')
f5_room505 = add_node('F5', 2700, 900, 'ROOM505', 'CLASSROOM')
f5_room506 = add_node('F5', 2700, 600, 'ROOM506', 'CLASSROOM')
f5_toilet_e = add_node('F5', 2850, 1400, 'TOILET_EAST', 'TOILET')

f5_stairs_w = add_node('F5', 100, 800, 'STAIRS_WEST', 'STAIRS')
f5_stairs_e = add_node('F5', 2850, 800, 'STAIRS_EAST', 'STAIRS')
f5_elev_w = add_node('F5', 100, 1100, 'ELEVATOR_WEST', 'ELEVATOR')
f5_elev_e = add_node('F5', 2850, 1100, 'ELEVATOR_EAST', 'ELEVATOR')

add_edge(f5_lobby, f5_corridor_main, 40.0, 'F5')
add_edge(f5_corridor_main, f5_corridor_north, 40.0, 'F5')
add_edge(f5_lobby, f5_room501, 123.0, 'F5')
add_edge(f5_lobby, f5_room504, 122.0, 'F5')
add_edge(f5_corridor_main, f5_room501, 25.0, 'F5')
add_edge(f5_corridor_main, f5_room504, 25.0, 'F5')
add_edge(f5_room501, f5_room502, 30.0, 'F5')
add_edge(f5_room502, f5_room503, 30.0, 'F5')
add_edge(f5_room503, f5_stairs_w, 10.0, 'F5')
add_edge(f5_room501, f5_stairs_w, 15.0, 'F5')
add_edge(f5_room504, f5_room505, 30.0, 'F5')
add_edge(f5_room505, f5_room506, 30.0, 'F5')
add_edge(f5_room506, f5_stairs_e, 10.0, 'F5')
add_edge(f5_room504, f5_stairs_e, 15.0, 'F5')
add_edge(f5_toilet_w, f5_room501, 20.0, 'F5')
add_edge(f5_toilet_e, f5_room504, 20.0, 'F5')
add_edge(f5_lobby, f5_elev_w, 20.0, 'F5')
add_edge(f5_lobby, f5_elev_e, 20.0, 'F5')
add_edge(f5_corridor_main, f5_elev_w, 20.0, 'F5')
add_edge(f5_corridor_main, f5_elev_e, 20.0, 'F5')

# ==========================================
# B1 - Basement
# ==========================================
b1_lobby = add_node('B1', 1480, 1600, 'LOBBY', 'LOBBY')
b1_corridor_main = add_node('B1', 1480, 1200, 'CORRIDOR_MAIN', 'CORRIDOR')
b1_corridor_north = add_node('B1', 1480, 800, 'CORRIDOR_NORTH', 'CORRIDOR')

b1_lab101 = add_node('B1', 250, 1200, 'LAB101', 'LAB')
b1_lab102 = add_node('B1', 250, 900, 'LAB102', 'LAB')
b1_lab103 = add_node('B1', 250, 600, 'LAB103', 'LAB')
b1_toilet_w = add_node('B1', 100, 1400, 'TOILET_WEST', 'TOILET')

b1_lab104 = add_node('B1', 2700, 1200, 'LAB104', 'LAB')
b1_lab105 = add_node('B1', 2700, 900, 'LAB105', 'LAB')
b1_lab106 = add_node('B1', 2700, 600, 'LAB106', 'LAB')
b1_toilet_e = add_node('B1', 2850, 1400, 'TOILET_EAST', 'TOILET')

b1_stairs_w = add_node('B1', 100, 800, 'STAIRS_WEST', 'STAIRS')
b1_stairs_e = add_node('B1', 2850, 800, 'STAIRS_EAST', 'STAIRS')
b1_elev_w = add_node('B1', 100, 1100, 'ELEVATOR_WEST', 'ELEVATOR')
b1_elev_e = add_node('B1', 2850, 1100, 'ELEVATOR_EAST', 'ELEVATOR')

add_edge(b1_lobby, b1_corridor_main, 40.0, 'B1')
add_edge(b1_corridor_main, b1_corridor_north, 40.0, 'B1')
add_edge(b1_lobby, b1_lab101, 123.0, 'B1')
add_edge(b1_lobby, b1_lab104, 122.0, 'B1')
add_edge(b1_corridor_main, b1_lab101, 25.0, 'B1')
add_edge(b1_corridor_main, b1_lab104, 25.0, 'B1')
add_edge(b1_lab101, b1_lab102, 30.0, 'B1')
add_edge(b1_lab102, b1_lab103, 30.0, 'B1')
add_edge(b1_lab103, b1_stairs_w, 10.0, 'B1')
add_edge(b1_lab101, b1_stairs_w, 15.0, 'B1')
add_edge(b1_lab104, b1_lab105, 30.0, 'B1')
add_edge(b1_lab105, b1_lab106, 30.0, 'B1')
add_edge(b1_lab106, b1_stairs_e, 10.0, 'B1')
add_edge(b1_lab104, b1_stairs_e, 15.0, 'B1')
add_edge(b1_toilet_w, b1_lab101, 20.0, 'B1')
add_edge(b1_toilet_e, b1_lab104, 20.0, 'B1')
add_edge(b1_lobby, b1_elev_w, 20.0, 'B1')
add_edge(b1_lobby, b1_elev_e, 20.0, 'B1')
add_edge(b1_corridor_main, b1_elev_w, 20.0, 'B1')
add_edge(b1_corridor_main, b1_elev_e, 20.0, 'B1')

# ==========================================
# Cross-floor edges (stairs and elevators)
# ==========================================
floors = ['F1', 'F2', 'F3', 'F4', 'F5']
for i, floor in enumerate(floors[:-1]):
    next_floor = floors[i+1]
    # West stairs
    add_cross_floor(f'{floor}_STAIRS_WEST', f'{next_floor}_STAIRS_WEST', 'STAIRS', 5.0)
    # East stairs
    add_cross_floor(f'{floor}_STAIRS_EAST', f'{next_floor}_STAIRS_EAST', 'STAIRS', 5.0)
    # West elevator
    add_cross_floor(f'{floor}_ELEVATOR_WEST', f'{next_floor}_ELEVATOR_WEST', 'ELEVATOR', 3.0)
    # East elevator
    add_cross_floor(f'{floor}_ELEVATOR_EAST', f'{next_floor}_ELEVATOR_EAST', 'ELEVATOR', 3.0)

# Connect F1 to B1 via stairs and elevators
add_cross_floor('F1_STAIRS_WEST', 'B1_STAIRS_WEST', 'STAIRS', 5.0)
add_cross_floor('F1_STAIRS_EAST', 'B1_STAIRS_EAST', 'STAIRS', 5.0)
add_cross_floor('F1_ELEVATOR_WEST', 'B1_ELEVATOR_WEST', 'ELEVATOR', 3.0)
add_cross_floor('F1_ELEVATOR_EAST', 'B1_ELEVATOR_EAST', 'ELEVATOR', 3.0)

# Also connect main entrance to outside (virtual node for outdoor navigation integration)
# These are optional - helpful for outdoor-to-indoor transitions

# Build the complete document
building_doc = {
    'buildingId': BUILDING_ID,
    'buildingName': '综合实验教学楼',
    'campus': '北京邮电大学沙河校区',
    'location': {'lng': 116.29221, 'lat': 40.15827},
    'floors': ['B1', 'F1', 'F2', 'F3', 'F4', 'F5'],
    'floorPlans': {
        'B1': f'/images/indoor/{BUILDING_ID}/B1.jpg',
        'F1': f'/images/indoor/{BUILDING_ID}/F1.jpg',
        'F2': f'/images/indoor/{BUILDING_ID}/F2.jpg',
        'F3': f'/images/indoor/{BUILDING_ID}/F3.jpg',
        'F4': f'/images/indoor/{BUILDING_ID}/F4.jpg',
        'F5': f'/images/indoor/{BUILDING_ID}/F5.jpg',
    },
    'nodes': nodes,
    'edges': edges,
    'crossFloorEdges': cross_floor_edges,
    'updatedAt': datetime.datetime.now().isoformat()
}

# Insert into MongoDB
client = MongoClient(MONGO_URI)
db = client['JourneyCraft']
collection = db['indoor_navigation']

# Replace existing
collection.delete_many({'buildingId': BUILDING_ID})
result = collection.insert_one(building_doc)

print(f'Inserted building {BUILDING_ID} with ID: {result.inserted_id}')
print(f'Total nodes: {len(nodes)}')
print(f'Total edges: {len(edges)}')
print(f'Total cross-floor edges: {len(cross_floor_edges)}')

# Verify by querying back
doc = collection.find_one({'buildingId': BUILDING_ID})
if doc:
    print(f'Verified: buildingId={doc["buildingId"]}, floors={doc["floors"]}')
    print(f'Node count: {len(doc["nodes"])}, Edge count: {len(doc["edges"])}')