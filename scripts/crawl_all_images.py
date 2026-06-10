"""
Crawl images for ALL spots and foods that don't have images yet.
Directly updates the database after download.
"""
import os, re, time, hashlib, requests, pymysql
from pathlib import Path
from io import BytesIO
from PIL import Image as PILImage, ImageDraw, ImageFont

DB = {
    "host": "localhost", "port": 3306,
    "user": "root", "password": "root123",
    "database": "journeycraft", "charset": "utf8mb4",
}
UPLOAD_BASE = os.path.expanduser("~/journeycraft-uploads")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
}

def bing_search(query):
    try:
        r = requests.get("https://www.bing.com/images/search",
            params={"q": query, "FORM": "HDRSC2", "count": 10},
            headers=HEADERS, timeout=15)
        if r.status_code != 200:
            return []
        urls = []
        for pat in [r'mediaurl="([^"]+)"', r'murl="([^"]+)"', r'src="([^"]+\.(jpg|jpeg|png|webp))"']:
            for m in re.finditer(pat, r.text, re.IGNORECASE):
                u = m.group(1)
                if u.startswith("http") and u not in urls:
                    urls.append(u)
        return urls
    except:
        return []

def download(url, filepath):
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200 or not r.headers.get("content-type", "").startswith("image/"):
            return False
        if len(r.content) < 2048:
            return False
        try:
            img = PILImage.open(BytesIO(r.content))
            img.verify()
        except:
            return False
        ext_map = {"jpeg": ".jpg", "png": ".png", "webp": ".webp", "gif": ".gif"}
        ext = ext_map.get(r.headers["content-type"].split("/")[-1], ".jpg")
        dest = filepath.with_suffix(ext)
        with open(dest, "wb") as f:
            f.write(r.content)
        if dest.stat().st_size > 500 * 1024:
            try:
                img = PILImage.open(dest)
                img.thumbnail((800, 600))
                img.save(dest, quality=80)
            except:
                pass
        return True
    except:
        return False

def make_placeholder(name, subdir):
    save_dir = Path(UPLOAD_BASE) / subdir
    save_dir.mkdir(parents=True, exist_ok=True)
    h = int(hashlib.md5(name.encode()).hexdigest()[:6], 16)
    r, g, b = (h >> 16) & 0xFF, (h >> 8) & 0xFF, h & 0xFF
    bg = (min(r + 100, 255), min(g + 100, 255), min(b + 100, 255))
    fg = (max(r - 60, 0), max(g - 60, 0), max(b - 60, 0))
    img = PILImage.new("RGB", (400, 300), bg)
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 26)
    except:
        font = ImageFont.load_default()
    try:
        bbox = draw.textbbox((0, 0), name[:12], font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(((400 - tw) // 2, (300 - th) // 2), name[:12], fill=fg, font=font)
    except:
        pass
    slug = re.sub(r'[^\w\u4e00-\u9fff]', '_', name).strip('_').lower() or "img"
    fp = save_dir / f"{slug}.jpg"
    img.save(fp, quality=80)
    return f"/uploads/{subdir}/{slug}.jpg"

def process_item(name, subdir, search_hint):
    save_dir = Path(UPLOAD_BASE) / subdir
    save_dir.mkdir(parents=True, exist_ok=True)
    slug = re.sub(r'[^\w\u4e00-\u9fff]', '_', name).strip('_').lower() or "img"
    fp = save_dir / slug

    for attempt in [search_hint, f"{name} {'景点' if subdir=='spots' else '美食'}", f"{name} 照片"]:
        urls = bing_search(attempt)
        if urls:
            for url in urls[:5]:
                if download(url, fp):
                    for ext in ['.jpg', '.png', '.webp', '.gif']:
                        p = fp.with_suffix(ext)
                        if p.exists():
                            return f"/uploads/{subdir}/{p.name}"
                time.sleep(0.3)
        time.sleep(0.5)

    return make_placeholder(name, subdir)

def main():
    conn = pymysql.connect(**DB)
    cur = conn.cursor()

    for table, subdir, hint_field in [
        ("spots", "spots", "name"),
        ("foods", "foods", "name"),
    ]:
        cur.execute(f"SELECT id, name FROM {table} WHERE image_url IS NULL OR image_url = ''")
        items = cur.fetchall()
        print(f"\n{'='*60}")
        print(f"{table.upper()}: {len(items)} items without images")
        print(f"{'='*60}")

        for i, (item_id, name) in enumerate(items, 1):
            print(f"\n[{i}/{len(items)}] {name}")
            url = process_item(name, subdir, f"{name}")
            print(f"  -> {url}")
            try:
                cur.execute(
                    f"UPDATE {table} SET image_url = %s WHERE id = %s AND (image_url IS NULL OR image_url = '')",
                    (url, item_id),
                )
                conn.commit()
                if cur.rowcount > 0:
                    print(f"  [OK] Updated")
                else:
                    print(f"  [--] Already had image")
            except Exception as e:
                print(f"  [FAIL] {e}")
            time.sleep(1)

    cur.close()
    conn.close()
    print("\nDone!")

if __name__ == "__main__":
    main()
