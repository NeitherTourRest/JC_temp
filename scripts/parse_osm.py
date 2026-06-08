#!/usr/bin/env python3
"""
Parse Changping OSM PBF data and extract road network as JSON graph.
Uses pyosmium for PBF parsing.
Output: D:\JC\JC\src\main\resources\data\road_network.json
"""
import osmium
import json
import sys
import os


class RoadNetworkHandler(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.nodes = {}  # node_id -> (lat, lon)
        self.edges = []  # list of edge dicts
        self.way_count = 0
        self.node_count = 0

    def node(self, n):
        self.nodes[n.id] = (n.location.lat, n.location.lon)
        self.node_count += 1

    def way(self, w):
        if 'highway' not in w.tags:
            return
        
        highway_type = w.tags.get('highway', '')
        # Filter for navigable road types
        valid_types = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary',
                       'residential', 'service', 'footway', 'path', 'pedestrian',
                       'cycleway', 'steps', 'living_street', 'unclassified']
        
        if highway_type not in valid_types:
            return

        name = w.tags.get('name', '')
        oneway = w.tags.get('oneway', 'no') == 'yes'
        maxspeed_str = w.tags.get('maxspeed', '40')
        try:
            maxspeed = float(maxspeed_str)
        except ValueError:
            maxspeed = 40.0

        refs = [n.ref for n in w.nodes]
        for i in range(len(refs) - 1):
            self.edges.append({
                'from': refs[i],
                'to': refs[i + 1],
                'way_id': w.id,
                'road_type': highway_type,
                'name': name,
                'oneway': oneway,
                'maxspeed': maxspeed
            })
        
        self.way_count += 1

        if self.way_count % 5000 == 0:
            print(f"  Processed {self.way_count} ways...")


def main():
    input_file = os.path.join(os.path.dirname(__file__), '..', 'OSM', 'Changping.osm.pbf')
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'JC', 'src', 'main', 'resources', 'data')
    output_file = os.path.join(output_dir, 'road_network.json')
    
    os.makedirs(output_dir, exist_ok=True)
    
    print(f"Parsing: {input_file}")
    handler = RoadNetworkHandler()
    handler.apply_file(input_file)
    
    print(f"Nodes: {handler.node_count}, Edges: {len(handler.edges)}, Ways: {handler.way_count}")
    
    # Save nodes (only those used in edges)
    used_nodes = set()
    for e in handler.edges:
        used_nodes.add(e['from'])
        used_nodes.add(e['to'])
    
    filtered_nodes = {str(nid): {'lat': lat, 'lng': lon} 
                      for nid, (lat, lon) in handler.nodes.items() 
                      if nid in used_nodes}
    
    data = {
        'name': 'changping_road_network',
        'nodes': filtered_nodes,
        'edges': [{'from': str(e['from']), 'to': str(e['to']), 
                   'roadType': e['road_type'], 'name': e['name'],
                   'isOneWay': e['oneway'], 'maxSpeed': e['maxspeed']} 
                  for e in handler.edges]
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    
    print(f"Saved to: {output_file}")
    print(f"File size: {os.path.getsize(output_file) / 1024 / 1024:.2f} MB")
    print("Done!")


if __name__ == '__main__':
    main()
