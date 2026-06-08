import pymongo

c = pymongo.MongoClient('mongodb://localhost:27017/JourneyCraft')
db = c['JourneyCraft']
col = db['indoor_navigation']

# Create index on buildingId to ensure it's queryable
col.create_index('buildingId')

# Verify index exists
print('Indexes:', col.index_information())

# Try to query using the exact pattern Spring would use
# In MongoDB, field names are case-sensitive
doc = col.find_one({'buildingId': 'BUPT_ZHONGHE_ZONGHE'})
print('Query result:', doc is not None)
if doc:
    print('buildingId:', doc['buildingId'])
    print('nodes sample:', [n['id'] for n in doc['nodes'][:3]])
    print('edges sample:', doc['edges'][:2])

# Also check if maybe there's an issue with the document structure
# by looking at what findByBuildingId would return
print('---')
print('Testing with regex (in case of whitespace issues):')
import re
doc2 = col.find_one({'buildingId': {'$regex': '^BUPT_ZHONGHE_ZONGHE$'}})
print('Regex query result:', doc2 is not None)