"""
Crawl images for all spots and foods using Bing Image search,
download to uploads directory, generate SQL UPDATE statements.
"""
import os, re, time, hashlib
from pathlib import Path
from io import BytesIO
import requests
from PIL import Image as PILImage, ImageDraw, ImageFont

UPLOAD_BASE = os.path.expanduser("~/journeycraft-uploads")

SPOTS = [
    ("十三陵", "HISTORIC"), ("居庸关长城", "HISTORIC"), ("蟒山国家森林公园", "NATURE"),
    ("温都水城", "ENTERTAINMENT"), ("中国航空博物馆", "MUSEUM"), ("银山塔林", "HISTORIC"),
    ("沙河水库", "NATURE"), ("北京航空航天大学沙河校区", "SCHOOL"),
    ("中央财经大学沙河校区", "SCHOOL"), ("昌平公园", "PARK"),
    ("大杨山森林公园", "NATURE"), ("白虎涧自然风景区", "NATURE"),
    ("双龙山森林公园", "NATURE"), ("昌平博物馆", "MUSEUM"),
    ("北京后花园景区", "NATURE"), ("昌平新城滨河公园", "PARK"),
    ("小汤山温泉度假村", "ENTERTAINMENT"), ("延寿寺", "HISTORIC"),
    ("静之湖度假村", "ENTERTAINMENT"), ("昌平农业嘉年华", "ENTERTAINMENT"),
]

FOODS = [
    "昌平烤羊腿", "十三陵农家菜", "长城脚下咖啡", "蟒山素斋", "温都自助餐",
    "清真兰州拉面", "川味火锅", "日料寿司", "北京烤鸭", "炸酱面",
    "卤煮火烧", "豆汁儿焦圈", "涮羊肉", "羊蝎子", "宫保鸡丁",
    "麻婆豆腐", "水煮鱼", "酸菜鱼", "麻辣香锅", "黄焖鸡米饭",
    "重庆小面", "桂林米粉", "兰州牛肉面", "西安肉夹馍",
    "云南过桥米线", "螺蛳粉", "肠粉", "煎饼果子", "糖葫芦",
    "烤冷面", "蛋炒饭", "小笼包", "生煎包", "饺子",
    "汤圆", "肉粽", "青团", "春卷", "臭豆腐",
    "章鱼小丸子", "咖喱蟹", "冬阴功汤", "日式拉面", "寿司拼盘",
    "韩式烤肉", "石锅拌饭", "意大利面", "披萨", "牛排", "提拉米苏",
]


def slug(name: str) -> str:
    s = re.sub(r'[^\w\u4e00-\u9fff]', '_', name).strip('_').lower()
    return s or 'image'


def bing_image_search(query: str) -> list:
    headers = {
        "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                       "AppleWebKit/537.36 (KHTML, like Gecko) "
                       "Chrome/125.0.0.0 Safari/537.36"),
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    }
    try:
        resp = requests.get(
            "https://www.bing.com/images/search",
            params={"q": query, "FORM": "HDRSC2", "count": 15},
            headers=headers, timeout=15
        )
        if resp.status_code != 200:
            return []
        urls = []
        for pat in [r'mediaurl="([^"]+)"', r'murl="([^"]+)"', r'src="([^"]+\.(jpg|jpeg|png|webp))"']:
            for m in re.finditer(pat, resp.text, re.IGNORECASE):
                u = m.group(1)
                if u.startswith('http') and u not in urls:
                    urls.append(u)
        return urls
    except:
        return []


def download_image(url: str, filepath: Path) -> bool:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.bing.com/",
    }
    try:
        resp = requests.get(url, headers=headers, timeout=15)
        if resp.status_code != 200:
            return False
        ct = resp.headers.get("content-type", "")
        if not ct.startswith("image/"):
            return False
        content = resp.content
        if len(content) < 2048:
            return False
        try:
            img = PILImage.open(BytesIO(content))
            img.verify()
        except:
            return False
        ext_map = {"jpeg": ".jpg", "png": ".png", "webp": ".webp", "gif": ".gif"}
        ext = ext_map.get(ct.split("/")[-1], ".jpg")
        with open(filepath.with_suffix(ext), "wb") as f:
            f.write(content)
        if filepath.with_suffix(ext).stat().st_size > 500 * 1024:
            try:
                img = PILImage.open(filepath.with_suffix(ext))
                img.thumbnail((800, 600))
                img.save(filepath.with_suffix(ext), quality=80)
            except:
                pass
        return True
    except:
        return False


def make_placeholder(name: str, subdir: str) -> str:
    save_dir = Path(UPLOAD_BASE) / subdir
    save_dir.mkdir(parents=True, exist_ok=True)
    sl = slug(name)
    fp = save_dir / f"{sl}.jpg"
    h = int(hashlib.md5(name.encode()).hexdigest()[:6], 16)
    r, g, b = (h >> 16) & 0xFF, (h >> 8) & 0xFF, h & 0xFF
    bg = (min(r + 100, 255), min(g + 100, 255), min(b + 100, 255))
    fg = (max(r - 60, 0), max(g - 60, 0), max(b - 60, 0))
    img = PILImage.new('RGB', (400, 300), bg)
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 26)
    except:
        font = ImageFont.load_default()
    txt = name[:12]
    try:
        bbox = draw.textbbox((0, 0), txt, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text(((400 - tw) // 2, (300 - th) // 2), txt, fill=fg, font=font)
    except:
        pass
    img.save(fp, quality=80)
    url = f"/uploads/{subdir}/{sl}.jpg"
    print(f"  [placeholder] {url}")
    return url


def process_item(name: str, subdir: str, hint: str) -> str:
    print(f"  Searching: {hint}")
    urls = bing_image_search(hint)
    save_dir = Path(UPLOAD_BASE) / subdir
    save_dir.mkdir(parents=True, exist_ok=True)
    sl = slug(name)

    if urls:
        print(f"  Found {len(urls)} candidate(s), downloading...")
        for url in urls[:5]:
            fp = save_dir / sl
            if download_image(url, fp):
                for ext in ['.jpg', '.png', '.webp', '.gif']:
                    p = fp.with_suffix(ext)
                    if p.exists():
                        url_path = f"/uploads/{subdir}/{p.name}"
                        print(f"  [ok] {url_path}")
                        return url_path
            time.sleep(0.5)

    # Retry with different search
    alt = f"{name} {'景区' if subdir == 'spots' else '美食'}"
    print(f"  Retrying: {alt}")
    urls = bing_image_search(alt)
    if urls:
        for url in urls[:5]:
            fp = save_dir / sl
            if download_image(url, fp):
                for ext in ['.jpg', '.png', '.webp', '.gif']:
                    p = fp.with_suffix(ext)
                    if p.exists():
                        url_path = f"/uploads/{subdir}/{p.name}"
                        print(f"  [ok] {url_path}")
                        return url_path
            time.sleep(0.5)

    return make_placeholder(name, subdir)


def main():
    os.makedirs(UPLOAD_BASE, exist_ok=True)
    sql, ok, ph = [], 0, 0

    print("=" * 60)
    print(f"Processing {len(SPOTS)} SPOTS + {len(FOODS)} FOODS")
    print("=" * 60)

    for i, (name, cat) in enumerate(SPOTS, 1):
        print(f"\n[{i}/{len(SPOTS)}] Spot: {name} ({cat})")
        url = process_item(name, "spots", f"{name} 景点")
        url_esc = url.replace("'", "''")
        sql.append(f"UPDATE spots SET image_url = '{url_esc}' WHERE name = '{name}' AND image_url IS NULL;")
        if "placeholder" in url: ph += 1
        else: ok += 1
        time.sleep(2)

    for i, name in enumerate(FOODS, 1):
        print(f"\n[{i}/{len(FOODS)}] Food: {name}")
        url = process_item(name, "foods", f"{name} 菜")
        url_esc = url.replace("'", "''")
        sql.append(f"UPDATE foods SET image_url = '{url_esc}' WHERE name = '{name}' AND image_url IS NULL;")
        if "placeholder" in url: ph += 1
        else: ok += 1
        time.sleep(2)

    sql_path = Path(UPLOAD_BASE) / "update_images.sql"
    with open(sql_path, 'w', encoding='utf-8') as f:
        f.write("-- Image URL updates\n")
        f.write(f"-- Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write('\n'.join(sql))
    print(f"\n{'='*60}")
    print(f"Done! {ok} real images, {ph} placeholders")
    print(f"SQL: {sql_path}")
    print(f"Run: mysql -u root -p journeycraft < {sql_path}")
    print("=" * 60)


if __name__ == "__main__":
    main()
