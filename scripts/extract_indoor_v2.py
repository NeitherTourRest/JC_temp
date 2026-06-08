"""
Extract indoor navigation data from floor plan images.
"""
import os
import cv2
import numpy as np
from pymongo import MongoClient
import datetime
import shutil

# Copy images to temp directory first (cv2 can't read Chinese paths directly)
TEMP_DIR = r'D:\JC\temp'
SOURCE_DIR = r'D:\JC\.pic\综合教学楼'
MONGO_URI = 'mongodb://localhost:27017/JourneyCraft'
BUILDING_ID = 'BUPT_ZHONGHE_ZONGHE'

os.makedirs(TEMP_DIR, exist_ok=True)

# Copy all images
floor_files = {'B1': 'B1.jpg', 'F1': 'F1.jpg', 'F2': 'F2.jpg', 'F3': 'F3.jpg', 'F4': 'F4.jpg', 'F5': 'F5.jpg'}
for floor, filename in floor_files.items():
    src = os.path.join(SOURCE_DIR, filename)
    dst = os.path.join(TEMP_DIR, f'{floor}.jpg')
    shutil.copy(src, dst)
    print(f'Copied {filename} -> {floor}.jpg')

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client['JourneyCraft']
collection = db['indoor_navigation']

def analyze_floor(img, floor):
    """Analyze a floor plan image and extract room/contour data."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Find all contours (walls/rooms)
    edges = cv2.Canny(gray, 30, 100)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # Filter to meaningful areas
    large_contours = [c for c in contours if cv2.contourArea(c) > 2000]

    rooms = []
    for i, contour in enumerate(sorted(large_contours, key=cv2.contourArea, reverse=True)):
        x, y, w, h = cv2.boundingRect(contour)
        area = cv2.contourArea(contour)

        # Classify room type by area (rough heuristic)
        room_type = 'CLASSROOM'
        if area > 200000:
            room_type = 'LOBBY'
        elif 50000 < area < 100000:
            room_type = 'CLASSROOM'
        elif 10000 < area < 50000:
            room_type = 'LAB'
        elif w < 60 or h < 60:
            room_type = 'OFFICE'
        elif y > gray.shape[0] * 0.8:
            room_type = 'LOBBY'

        rooms.append({
            'id': f'{floor}_ROOM_{i+1}',
            'floor': floor,
            'x': int(x),
            'y': int(y),
            'width': int(w),
            'height': int(h),
            'area': float(area),
            'type': room_type,
            'name': f'{floor}室{i+1}'
        })

    return rooms

# Process each floor
floor_data_list = []
for floor in ['B1', 'F1', 'F2', 'F3', 'F4', 'F5']:
    path = os.path.join(TEMP_DIR, f'{floor}.jpg')
    img = cv2.imread(path)
    if img is None:
        print(f'Failed to load {floor}')
        continue

    rooms = analyze_floor(img, floor)
    print(f'{floor}: {len(rooms)} rooms detected')

    floor_data_list.append({
        'buildingId': BUILDING_ID,
        'floor': floor,
        'rooms': rooms,
        'imageWidth': img.shape[1],
        'imageHeight': img.shape[0],
        'processedAt': datetime.datetime.now().isoformat()
    })

# Check if building document already exists
existing = collection.find_one({'buildingId': BUILDING_ID})
if existing:
    print(f'Updating existing document {existing["_id"]}')
    collection.delete_one({'buildingId': BUILDING_ID})

# Create building document with all floors
building_doc = {
    'buildingId': BUILDING_ID,
    'buildingName': '综合实验教学楼',
    'campus': '北京邮电大学沙河校区',
    'location': {'lng': 116.29221, 'lat': 40.15827},
    'floors': ['B1', 'F1', 'F2', 'F3', 'F4', 'F5'],
    'floorPlans': {
        'B1': f'/images/indoor/{BUILDING_ID}/B1.jpg',
        'F1': f'/images/indoor/{BUILDING_ID}/F1.jpg',
        'F2': f'/images/indoor/{BUILDING_ID}/F2.jpg',
        'F3': f'/images/indoor/{BUILDING_ID}/F3.jpg',
        'F4': f'/images/indoor/{BUILDING_ID}/F4.jpg',
        'F5': f'/images/indoor/{BUILDING_ID}/F5.jpg',
    },
    'floorData': floor_data_list,
    'updatedAt': datetime.datetime.now().isoformat()
}

# Insert into MongoDB (replace)
collection.delete_many({'buildingId': BUILDING_ID})
result = collection.insert_one(building_doc)
print(f'Inserted with ID: {result.inserted_id}')
print(f'Total floors: {len(floor_data_list)}, Total rooms: {sum(len(f["rooms"]) for f in floor_data_list)}')