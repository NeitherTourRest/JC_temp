import pymongo

# Check what the Java app would see
client = pymongo.MongoClient('mongodb://localhost:27017/JourneyCraft')
db = client['JourneyCraft']
col = db['indoor_navigation']

# Try the exact query
doc = col.find_one({'buildingId': 'BUPT_ZHONGHE_ZONGHE'})
print('Direct query result:', doc is not None)
if doc:
    print('buildingId field:', doc.get('buildingId'))
    print('Type:', type(doc.get('buildingId')))

# Also check what Spring Data MongoDB would see
# The repository uses findByBuildingId which maps to {'buildingId': X}
# Let's verify the field exists
docs = list(col.find({}))
for d in docs:
    bid = d.get('buildingId')
    print(f'Doc id={d["_id"]}, buildingId={bid}, type={type(bid)}')