"""Fill remaining spots/foods with placeholder images directly in DB."""
import os, re, hashlib, pymysql
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

DB = {"host":"localhost","port":3306,"user":"root","password":"root123","database":"journeycraft","charset":"utf8mb4"}
BASE = os.path.expanduser("~/journeycraft-uploads")

def make_placeholder(name, subdir):
    d = Path(BASE) / subdir
    d.mkdir(parents=True, exist_ok=True)
    h = int(hashlib.md5(name.encode()).hexdigest()[:6], 16)
    r, g, b = (h>>16)&0xFF, (h>>8)&0xFF, h&0xFF
    bg = (min(r+100,255), min(g+100,255), min(b+100,255))
    fg = (max(r-60,0), max(g-60,0), max(b-60,0))
    img = Image.new("RGB", (400,300), bg)
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 26)
    except:
        font = ImageFont.load_default()
    try:
        bbox = draw.textbbox((0,0), name[:12], font=font)
        tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
        draw.text(((400-tw)//2, (300-th)//2), name[:12], fill=fg, font=font)
    except:
        pass
    slug = re.sub(r'[^\w\u4e00-\u9fff]', '_', name).strip('_').lower() or "img"
    fp = d / f"{slug}.jpg"
    img.save(fp, quality=80)
    return f"/uploads/{subdir}/{slug}.jpg"

conn = pymysql.connect(**DB)
cur = conn.cursor()

for table, subdir in [("spots","spots"), ("foods","foods")]:
    cur.execute(f"SELECT id, name FROM {table} WHERE image_url IS NULL OR image_url = ''")
    items = cur.fetchall()
    print(f"{table}: {len(items)} remaining")
    for item_id, name in items:
        url = make_placeholder(name, subdir)
        cur.execute(f"UPDATE {table} SET image_url = %s WHERE id = %s", (url, item_id))
        print(f"  {name[:20]:<20s} -> {url}")
    conn.commit()

cur.close()
conn.close()
print("\nDone! All items now have image URLs.")
