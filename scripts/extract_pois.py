import osmium, json

class NameFinder(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.pois = []  # (name, lat, lon, type)

    def node(self, n):
        if n.tags and 'name' in n.tags:
            name = n.tags.get('name', '')
            self.pois.append({'name': name, 'lat': n.location.lat, 'lon': n.location.lon, 'type': 'node'})

    def way(self, w):
        if w.tags and 'name' in w.tags and 'highway' in w.tags:
            name = w.tags.get('name', '')
            self.pois.append({'name': name, 'lat': 0, 'lon': 0, 'type': 'road'})

finder = NameFinder()
finder.apply_file('D:/JC/OSM/Changping.osm.pbf')
print(f"Total named POIs: {len(finder.pois)}")

# Search for universities, schools, subways
keywords = ['大学', '学院', '地铁', '邮电', '沙河', '十三陵', '居庸关', '长城', '公园', '博物馆', '航空', '温都']
matches = [p for p in finder.pois if any(k in p['name'] for k in keywords)]
print(f"\nKeyword matches: {len(matches)}")
for p in sorted(matches, key=lambda x: x['name'])[:30]:
    print(f"  {p['name']} ({p['lat']:.5f}, {p['lon']:.5f})")

# Save ALL named POIs to JSON
with open('D:/JC/JC/src/main/resources/data/pois.json', 'w', encoding='utf-8') as f:
    json.dump(finder.pois, f, ensure_ascii=False)
print(f"\nAll {len(finder.pois)} POIs saved to pois.json")
