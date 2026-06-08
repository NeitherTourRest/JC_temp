import pymongo

c = pymongo.MongoClient('mongodb://localhost:27017/')
db = c['JourneyCraft']
col = db['indoor_navigation']

doc = col.find_one({'buildingId': 'BUPT_ZHONGHE_ZONGHE'})
if not doc:
    print('NOT FOUND')
    exit(1)

print('=== MongoDB Data ===')
print('buildingId:', doc['buildingId'])
print('floors:', doc['floors'])
print('nodes:', len(doc['nodes']))
print('edges:', len(doc['edges']))
print('crossFloorEdges:', len(doc['crossFloorEdges']))

# Cross-floor coverage
floors_connected = set()
for e in doc['crossFloorEdges']:
    from_floor = e['from'].split('_')[0]
    to_floor = e['to'].split('_')[0]
    floors_connected.add(from_floor)
    floors_connected.add(to_floor)
print('Cross-floor connected floors:', sorted(floors_connected))

# Node ID uniqueness
ids = [n['id'] for n in doc['nodes']]
dupes = [x for x in set(ids) if ids.count(x) > 1]
print('Duplicate IDs:', dupes if dupes else 'None')

# Edge reference integrity
node_ids = set(ids)
missing = []
for e in doc['edges']:
    if e['from'] not in node_ids:
        missing.append('from:' + e['from'])
    if e['to'] not in node_ids:
        missing.append('to:' + e['to'])
for e in doc['crossFloorEdges']:
    if e['from'] not in node_ids:
        missing.append('cf_from:' + e['from'])
    if e['to'] not in node_ids:
        missing.append('cf_to:' + e['to'])
print('Missing references:', missing[:10] if missing else 'None')

# Show sample cross-floor edges
print('\nSample crossFloorEdges:')
for e in doc['crossFloorEdges'][:8]:
    print(' ', e['from'], '->', e['to'], e['type'], e['dist'], 'm')
print(' ... total', len(doc['crossFloorEdges']), 'cross-floor edges')

# Show sample nodes per floor
from collections import Counter
floor_counts = Counter(n['floor'] for n in doc['nodes'])
type_counts = Counter(n['type'] for n in doc['nodes'])
print('\nNodes per floor:', dict(floor_counts))
print('Types:', dict(type_counts))
