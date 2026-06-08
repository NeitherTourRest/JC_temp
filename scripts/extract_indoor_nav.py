#!/usr/bin/env python
"""
Extract indoor navigation data from floor plan images
"""

import os
import cv2
import numpy as np
from pymongo import MongoClient
import datetime

# Configuration
IMAGE_DIR = r'D:\JC\.pic\temp'
MONGO_URI = 'mongodb://localhost:27017/JourneyCraft'
BUILDING_ID = 'BUPT_ZHONGHE_ZONGHE'

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client['JourneyCraft']
collection = db['indoor_navigation']

# Process each floor image
for filename in os.listdir(IMAGE_DIR):
    if filename.lower().endswith('.jpg') or filename.lower().endswith('.png'):
        # Extract floor level from filename
        if filename.startswith('F'):
            floor = int(filename[1])  # F1 -> 1, F2 -> 2, etc.
        elif filename.startswith('B'):
            floor = -int(filename[1])  # B1 -> -1, B2 -> -2, etc.
        else:
            continue
        
        # Load image
        img_path = os.path.join(IMAGE_DIR, filename)
        img = cv2.imread(img_path)
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply thresholding to detect walls/hallways
        _, thresh = cv2.threshold(gray, 128, 255, cv2.THRESH_BINARY_INV)
        
        # Find contours (walls)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter contours by size (remove small noise)
        min_area = 100
        filtered_contours = [c for c in contours if cv2.contourArea(c) > min_area]
        
        # Extract room information from contours
        rooms = []
        for contour in filtered_contours:
            # Approximate contour to polygon
            epsilon = 0.02 * cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, epsilon, True)
            
            # Only consider polygons with 3+ sides
            if len(approx) >= 3:
                # Calculate bounding rectangle
                x, y, w, h = cv2.boundingRect(approx)
                
                # Add room info
                room = {
                    'floor': floor,
                    'x': x,
                    'y': y,
                    'width': w,
                    'height': h,
                    'area': cv2.contourArea(approx),
                    'contour': approx.tolist()
                }
                rooms.append(room)
        
        # Save floor data to MongoDB
        floor_data = {
            'buildingId': BUILDING_ID,
            'floor': floor,
            'rooms': rooms,
            'imagePath': img_path,
            'processedAt': str(datetime.datetime.now())
        }
        
        collection.insert_one(floor_data)
        print(f'Saved floor {floor} with {len(rooms)} rooms')

print('Processing complete!')