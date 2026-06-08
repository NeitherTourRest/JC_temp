"""
Read all floor modeling files, merge into one IndoorBuilding document,
generate cross-floor edges, and insert into MongoDB.
"""
import json, os, datetime
from pymongo import MongoClient

MONGO_URI = 'mongodb://localhost:27017/JourneyCraft'
BUILDING_ID = 'BUPT_ZHONGHE_ZONGHE'
DOCS_DIR = r'D:\JC\docs'

def load_json(filename):
    with open(os.path.join(DOCS_DIR, filename), 'r', encoding='utf-8') as f:
        return json.loads(f.read())

# Load all floors
floors_order = ['B1', 'F1', 'F2', 'F3', 'F4', 'F5']
all_nodes = []
all_edges = []
cross_floor_edges = []

for f in floors_order:
    nodes = load_json(f'{f}_结点.md')
    edges = load_json(f'{f}_边.md')
    all_nodes.extend(nodes)
    all_edges.extend(edges)
    print(f'{f}: {len(nodes)} nodes, {len(edges)} edges')

# Validate: check that all edge references point to existing nodes
node_ids = set(n['id'] for n in all_nodes)
for e in all_edges:
    if e['from'] not in node_ids:
        print(f'WARN: edge from {e["from"]} not in nodes')
    if e['to'] not in node_ids:
        print(f'WARN: edge to {e["to"]} not in nodes')

# Generate cross-floor edges
# Strategy: match stairs/elevators by suffix pattern across floors
# For stairs: {floor}_STAIRS_{direction}{number}
# For elevators: {floor}_ELEVATOR_{direction}

# Group nodes by type and floor
stairs = {}  # key: suffix, value: {F1: node_id, F2: node_id, ...}
elevators = {}

for n in all_nodes:
    if n['type'] == 'STAIRS':
        # Extract the part after {floor}_
        prefix = n['floor'] + '_'
        suffix = n['id'][len(prefix):]
        if suffix not in stairs:
            stairs[suffix] = {}
        stairs[suffix][n['floor']] = n['id']
    elif n['type'] == 'ELEVATOR':
        prefix = n['floor'] + '_'
        suffix = n['id'][len(prefix):]
        if suffix not in elevators:
            elevators[suffix] = {}
        elevators[suffix][n['floor']] = n['id']

# Generate cross-floor edges for stairs
print("\nGenerating cross-floor edges...")
for suffix, floor_map in stairs.items():
    # Sort floors to connect consecutive ones
    available = sorted([f for f in floors_order if f in floor_map], 
                       key=lambda x: floors_order.index(x))
    for i in range(len(available) - 1):
        f1, f2 = available[i], available[i+1]
        cross_floor_edges.append({
            'from': floor_map[f1],
            'to': floor_map[f2],
            'type': 'STAIRS',
            'dist': 5.0
        })
        print(f'  STAIRS: {floor_map[f1]} -> {floor_map[f2]}')

# Generate cross-floor edges for elevators
for suffix, floor_map in elevators.items():
    available = sorted([f for f in floors_order if f in floor_map],
                       key=lambda x: floors_order.index(x))
    for i in range(len(available) - 1):
        f1, f2 = available[i], available[i+1]
        cross_floor_edges.append({
            'from': floor_map[f1],
            'to': floor_map[f2],
            'type': 'ELEVATOR',
            'dist': 3.0
        })
        print(f'  ELEVATOR: {floor_map[f1]} -> {floor_map[f2]}')

# Also match B1 stairs with F1 stairs by naming pattern
# B1 has: B1_STAIRS_W, B1_STAIRS_N, B1_STAIRS_S
# F1 has: F1_STAIRS_N1, F1_STAIRS_N2, F1_STAIRS_N3, F1_STAIRS_S1, F1_STAIRS_S2, F1_STAIRS_S3
# Try to find best matches by checking if B1 stairs connect to nearby F1 stairs

# Map B1 stairs without direction number to F1 stairs
b1_f1_stair_map = {
    'B1_STAIRS_W': 'F1_STAIRS_N1',     # West stairs likely connect to north-west stairs
    'B1_STAIRS_N': 'F1_STAIRS_N2',     # North stairs connect to middle north stairs
    'B1_STAIRS_S': 'F1_STAIRS_S2',     # South stairs connect to middle south stairs
}

for b1_stair, f1_stair in b1_f1_stair_map.items():
    if b1_stair in node_ids and f1_stair in node_ids:
        cross_floor_edges.append({
            'from': b1_stair,
            'to': f1_stair,
            'type': 'STAIRS',
            'dist': 5.0
        })
        print(f'  STAIRS (B1-F1): {b1_stair} -> {f1_stair}')

# B1 elevator to F1 elevator
if 'B1_ELEVATOR' in node_ids:
    # Find the best matching F1 elevator
    for n in all_nodes:
        if n['floor'] == 'F1' and n['type'] == 'ELEVATOR':
            cross_floor_edges.append({
                'from': 'B1_ELEVATOR',
                'to': n['id'],
                'type': 'ELEVATOR',
                'dist': 3.0
            })
            print(f'  ELEVATOR (B1-F1): B1_ELEVATOR -> {n["id"]}')
            break

print(f'\nTotal cross-floor edges: {len(cross_floor_edges)}')

# Build complete document
building_doc = {
    'buildingId': BUILDING_ID,
    'buildingName': '综合实验教学楼',
    'campus': '北京邮电大学沙河校区',
    'location': {'lng': 116.29221, 'lat': 40.15827},
    'floors': floors_order,
    'floorPlans': {
        f: f'/images/indoor/{BUILDING_ID}/{f}.jpg'
        for f in floors_order
    },
    'nodes': all_nodes,
    'edges': all_edges,
    'crossFloorEdges': cross_floor_edges,
    'updatedAt': datetime.datetime.now().isoformat()
}

# Insert into MongoDB
client = MongoClient(MONGO_URI)
db = client['JourneyCraft']
collection = db['indoor_navigation']

# Remove old
collection.delete_many({'buildingId': BUILDING_ID})
result = collection.insert_one(building_doc)

print(f'\nWritten to MongoDB with ID: {result.inserted_id}')
print(f'Total: {len(all_nodes)} nodes, {len(all_edges)} edges, {len(cross_floor_edges)} cross-floor edges')

# Verify
doc = collection.find_one({'buildingId': BUILDING_ID})
print(f'Verification: buildingId={doc["buildingId"]}, floors={doc["floors"]}')
print(f'  Nodes: {len(doc["nodes"])}, Edges: {len(doc["edges"])}, CrossFloorEdges: {len(doc["crossFloorEdges"])}')

# Count nodes per floor
from collections import Counter
floor_counts = Counter(n['floor'] for n in doc['nodes'])
for f in floors_order:
    print(f'  {f}: {floor_counts[f]} nodes')

# Count types
type_counts = Counter(n['type'] for n in doc['nodes'])
print(f'Types: {dict(type_counts)}')
