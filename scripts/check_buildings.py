import pymongo, json

c = pymongo.MongoClient('mongodb://localhost:27017/')
db = c['JourneyCraft']
col = db['indoor_navigation']
docs = list(col.find({}))
for d in docs:
    print('buildingId:', d['buildingId'])
    print('id:', d['_id'])
    print('floors:', d.get('floors'))
    print('---')