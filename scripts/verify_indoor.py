import pymongo

c = pymongo.MongoClient('mongodb://localhost:27017/')
db = c['JourneyCraft']
col = db['indoor_navigation']
doc = col.find_one({'buildingId': 'BUPT_ZHONGHE_ZONGHE'})
if doc:
    print('Building:', doc['buildingName'])
    print('Floors:', doc['floors'])
    print('Nodes:', len(doc['nodes']))
    print('Edges:', len(doc['edges']))
    print('CrossFloorEdges:', len(doc['crossFloorEdges']))
    for n in doc['nodes'][:5]:
        print(' ', n['id'], ':', n['name'], '(', n['type'], ') at floor', n['floor'])
else:
    print('NOT FOUND')