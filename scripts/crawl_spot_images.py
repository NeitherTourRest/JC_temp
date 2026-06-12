# -*- coding: utf-8 -*-
"""
为所有景点爬取图片（百度图片搜索），存入 ~/journeycraft-uploads/spots/。
"""
import os, re, time, requests, pymysql, hashlib
from pathlib import Path
from io import BytesIO
from PIL import Image as PILImage

DB = {"host":"localhost","port":3306,"user":"root","password":"root123","database":"journeycraft","charset":"utf8mb4"}
UPLOAD_BASE = os.path.expanduser("~/journeycraft-uploads")
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36"}
MIN_SIZE = 15 * 1024  # 15KB minimum

def baidu_search(keyword, max_results=10):
    urls = []
    try:
        r = requests.get("https://image.baidu.com/search/acjson", params={
            "tn": "resultjson_com", "word": keyword, "pn": 0, "rn": max_results,
        }, headers=HEADERS, timeout=15)
        if r.status_code != 200: return []
        data = r.json()
        for item in data.get("data", []):
            if not isinstance(item, dict): continue
            u = item.get("middleURL") or item.get("thumbURL")
            if u and u.startswith("http") and u not in urls:
                urls.append(u)
    except: pass
    return urls

def download(url, save_path):
    try:
        r = requests.get(url, headers={**HEADERS, "Referer": "https://image.baidu.com/"}, timeout=20)
        if r.status_code != 200: return False
        ct = r.headers.get("content-type", "")
        if not ct.startswith("image/"): return False
        content = r.content
        if len(content) < MIN_SIZE: return False
        try:
            img = PILImage.open(BytesIO(content))
            img.verify()
        except: return False
        ext_map = {"jpeg": ".jpg", "png": ".png", "webp": ".webp", "gif": ".gif"}
        ext = ext_map.get(ct.split("/")[-1], ".jpg")
        dest = save_path.with_suffix(ext)
        try:
            img = PILImage.open(BytesIO(content))
            w, h = img.size
            if max(w, h) > 1200:
                ratio = 1200 / max(w, h)
                img = img.resize((int(w * ratio), int(h * ratio)), PILImage.LANCZOS)
                img.save(dest, quality=85)
            else:
                with open(dest, "wb") as f: f.write(content)
        except:
            with open(dest, "wb") as f: f.write(content)
        return True
    except: return False

def process_item(name, subdir):
    save_dir = Path(UPLOAD_BASE) / subdir
    save_dir.mkdir(parents=True, exist_ok=True)
    slug = re.sub(r'[^\w\u4e00-\u9fff]', '_', name).strip('_').lower() or "img"
    fp = save_dir / slug
    
    # Try multiple search terms
    for term in [name, name + " 景点", name + " 照片", name + " 风景"]:
        urls = baidu_search(term, 10)
        if urls:
            for url in urls[:5]:
                if download(url, fp):
                    for ext in ['.jpg', '.png', '.webp', '.gif']:
                        p = fp.with_suffix(ext)
                        if p.exists() and p.stat().st_size >= MIN_SIZE:
                            return f"/uploads/{subdir}/{p.name}"
                time.sleep(0.3)
        time.sleep(0.5)
    
    # Create colored placeholder
    h = int(hashlib.md5(name.encode()).hexdigest()[:6], 16)
    r, g, b = (h>>16)&0xFF, (h>>8)&0xFF, h&0xFF
    bg = (min(r+100,255), min(g+100,255), min(b+100,255))
    fg = (max(r-60,0), max(g-60,0), max(b-60,0))
    img = PILImage.new("RGB", (400, 300), bg)
    from PIL import ImageDraw, ImageFont
    draw = ImageDraw.Draw(img)
    try: font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 26)
    except: font = ImageFont.load_default()
    try:
        bbox = draw.textbbox((0,0), name[:12], font=font)
        tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
        draw.text(((400-tw)//2, (300-th)//2), name[:12], fill=fg, font=font)
    except: pass
    slug2 = re.sub(r'[^\w\u4e00-\u9fff]', '_', name).strip('_').lower() or "img"
    fp2 = save_dir / f"{slug2}.jpg"
    img.save(fp2, quality=80)
    return f"/uploads/{subdir}/{slug2}.jpg"

def main():
    conn = pymysql.connect(**DB)
    cur = conn.cursor()
    cur.execute("SELECT id, name, image_url FROM spots WHERE image_url IS NULL OR image_url = ''")
    items = cur.fetchall()
    total = len(items)
    print(f"Spots without images: {total}")
    
    for i, (item_id, name, _) in enumerate(items, 1):
        print(f"[{i}/{total}] {name}", flush=True)
        url = process_item(name, "spots")
        if url:
            try:
                cur.execute("UPDATE spots SET image_url = %s WHERE id = %s", (url, item_id))
                conn.commit()
                print(f"  -> {url}")
            except Exception as e:
                print(f"  DB Error: {e}")
        time.sleep(1)
    
    cur.close()
    conn.close()
    print("Done!")

if __name__ == "__main__":
    main()
