import pymongo

c = pymongo.MongoClient('mongodb://localhost:27017/')
db = c['JourneyCraft']
col = db['indoor_navigation']

# Check the exact query that Spring Data MongoDB would make
from pymongo import ASCENDING
print('Indexes:', col.index_information())

# Try the findByBuildingId equivalent
doc = col.find_one({'buildingId': 'BUPT_ZHONGHE_ZONGHE'})
if doc:
    print('Found BUPT_ZHONGHE_ZONGHE')
    print('  id:', doc['_id'])
    print('  nodes sample:', [n['id'] for n in doc['nodes'][:3]])
else:
    print('NOT FOUND via find_one')

# Check which document is being used by the API
# The service finds by buildingId - let's verify
doc2 = col.find_one({'buildingId': 'BUPT_SHAHE_ZONGHE'})
if doc2:
    print('Found BUPT_SHAHE_ZONGHE')
    print('  id:', doc2['_id'])