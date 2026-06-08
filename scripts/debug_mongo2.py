import pymongo

c = pymongo.MongoClient('mongodb://localhost:27017/JourneyCraft')
db = c['JourneyCraft']
col = db['indoor_navigation']

docs = list(col.find({}))
print('Total docs:', len(docs))
print('Collections:', db.list_collection_names())

for d in docs:
    print('  _id:', d['_id'], ', buildingId:', d.get('buildingId'))
    print('  has nodes:', 'nodes' in d, 'count:', len(d.get('nodes', [])))
