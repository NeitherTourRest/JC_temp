import pymongo

c = pymongo.MongoClient('mongodb://localhost:27017/')
db = c['JourneyCraft']
col = db['indoor_navigation']

docs = list(col.find({}))
print('Total documents:', len(docs))
for d in docs:
    bid = d['buildingId']
    print('buildingId:', bid)
    print('floors:', d.get('floors'))
    print('nodes count:', len(d.get('nodes', [])))
    print('edges count:', len(d.get('edges', [])))
    print('crossFloorEdges count:', len(d.get('crossFloorEdges', [])))
    if 'floorData' in d:
        print('floorData count:', len(d['floorData']))
    print('---')