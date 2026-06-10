"""
Crawl real images for ALL spots and foods using Baidu Image Search API.
Overwrites existing placeholder files with actual photos.
Skips items where the file is already >15KB (real photo).
v2 — optimized for batch resumption.
"""
import os, re, time, requests, pymysql
from pathlib import Path
from io import BytesIO
from PIL import Image as PILImage

DB = {
    "host": "localhost", "port": 3306,
    "user": "root", "password": "root123",
    "database": "journeycraft", "charset": "utf8mb4",
}
UPLOAD_BASE = os.path.expanduser("~/journeycraft-uploads")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "Chrome/125.0.0.0 Safari/537.36",
    "Referer": "https://image.baidu.com/",
}

MIN_VALID_SIZE = 15 * 1024


def baidu_search(keyword: str, max_results: int = 10) -> list[str]:
    urls = []
    try:
        r = requests.get("https://image.baidu.com/search/acjson", params={
            "tn": "resultjson_com", "word": keyword,
            "pn": 0, "rn": max_results,
        }, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            return []
        data = r.json()
        for item in data.get("data", []):
            if not isinstance(item, dict):
                continue
            u = item.get("middleURL") or item.get("thumbURL")
            if u and u.startswith("http") and u not in urls:
                urls.append(u)
    except Exception:
        pass
    return urls


def download_image(url: str, save_path: Path) -> bool:
    try:
        r = requests.get(url, headers={**HEADERS, "Referer": "https://image.baidu.com/"}, timeout=20)
        if r.status_code != 200:
            return False
        ct = r.headers.get("content-type", "")
        if not ct.startswith("image/"):
            return False
        content = r.content
        if len(content) < MIN_VALID_SIZE:
            return False
        try:
            img = PILImage.open(BytesIO(content))
            img.verify()
        except Exception:
            return False
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
                with open(dest, "wb") as f:
                    f.write(content)
        except Exception:
            with open(dest, "wb") as f:
                f.write(content)
        return True
    except Exception:
        return False


def has_real_image(name: str, subdir: str) -> bool:
    save_dir = Path(UPLOAD_BASE) / subdir
    slug = re.sub(r'[^\w\u4e00-\u9fff]', '_', name).strip('_').lower() or "img"
    for ext in ['.jpg', '.png', '.webp', '.gif']:
        p = save_dir / f"{slug}{ext}"
        if p.exists() and p.stat().st_size >= MIN_VALID_SIZE:
            return True
    return False


def main():
    conn = pymysql.connect(**DB)
    cur = conn.cursor()

    total_ok = 0
    total_skip = 0
    total_fail = 0

    for table, subdir in [("spots", "spots"), ("foods", "foods")]:
        cur.execute(f"SELECT id, name, image_url FROM {table} ORDER BY id")
        items = cur.fetchall()
        print(f"\n{'='*60}")
        print(f"{table.upper()}: {len(items)} items")
        print(f"{'='*60}")

        for i, (item_id, name, current_url) in enumerate(items, 1):
            save_dir = Path(UPLOAD_BASE) / subdir
            save_dir.mkdir(parents=True, exist_ok=True)

            # Skip if already has a real photo
            if has_real_image(name, subdir):
                if i % 10 == 1:
                    print(f"\r[{i}/{len(items)}] ... {total_ok} new, {total_skip} skipped so far", end="")
                total_skip += 1
                continue

            slug = re.sub(r'[^\w\u4e00-\u9fff]', '_', name).strip('_').lower() or "img"
            search_terms = [
                name,
                f"{name} {'景点' if subdir == 'spots' else '美食'}",
                f"{name} 照片",
                f"{name} {'风景' if subdir == 'spots' else '餐厅'}",
            ]

            found = False
            print(f"\n[{i}/{len(items)}] {name}")

            for term in search_terms:
                image_urls = baidu_search(term)
                if not image_urls:
                    time.sleep(0.3)
                    continue

                for img_url in image_urls[:5]:
                    fp = save_dir / slug
                    if download_image(img_url, fp):
                        final_path = None
                        for ext in ['.jpg', '.png', '.webp', '.gif']:
                            p = fp.with_suffix(ext)
                            if p.exists() and p.stat().st_size >= MIN_VALID_SIZE:
                                final_path = p
                                break
                        if final_path:
                            size_kb = final_path.stat().st_size / 1024
                            print(f"    OK: {final_path.name} ({size_kb:.0f}KB)")
                            new_url = f"/uploads/{subdir}/{final_path.name}"
                            if new_url != current_url:
                                cur.execute(
                                    f"UPDATE {table} SET image_url = %s WHERE id = %s",
                                    (new_url, item_id),
                                )
                                conn.commit()
                            found = True
                            total_ok += 1
                            break
                    time.sleep(0.3)

                if found:
                    break
                time.sleep(0.5)

            if not found:
                print(f"    [FAIL] No image found for {name}")
                total_fail += 1

            time.sleep(0.5)

    cur.close()
    conn.close()

    print(f"\n{'='*60}")
    print(f"SUMMARY: {total_ok} downloaded, {total_skip} already had, {total_fail} failed")
    print(f"{'='*60}")
    print("Done!")


if __name__ == "__main__":
    main()
