from pymongo import MongoClient

c = MongoClient('mongodb://localhost:27017/')
db = c['JourneyCraft']
col = db['indoor_navigation']

doc = col.find_one({'buildingId': 'BUPT_ZHONGHE_ZONGHE'})
if doc:
    print('Building:', doc['buildingName'])
    print('Total nodes:', len(doc['nodes']))
    print()

    floors = {}
    for n in doc['nodes']:
        f = n['floor']
        if f not in floors:
            floors[f] = []
        floors[f].append(n)

    for f in ['B1', 'F1', 'F2', 'F3', 'F4', 'F5']:
        nodes = floors.get(f, [])
        print('===', f, '(', len(nodes), 'nodes) ===')
        for n in nodes[:8]:
            print('  ', n['id'], ':', n['name'], '(', n['type'], ') at (', n['x'], ',', n['y'], ')')
        print()
else:
    print('NOT FOUND')