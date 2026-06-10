"""Fix all corrupted characters in SpotDetailView.vue."""
import re

with open('D:\\JC\\frontend\\src\\views\\spot\\SpotDetailView.vue', 'rb') as f:
    raw = f.read()

text = raw.decode('utf-8', errors='replace')

# Fix all U+FFFD (replacement character / corrupted emoji) occurrences
# and also fix obvious corruption patterns

# Lines with corruption patterns:
corruptions = {
    'title="景点未找': 'title="景点未找到"',
    'sub-title="无法加载该景点信': 'sub-title="无法加载该景点信息"',
    '>?返回景点列表<': '>← 返回景点列表<',
    '?{{ spot.avgRating': '⭐ {{ spot.avgRating',
    "|| '? }}": "|| '—' }}",
    '>?Rate this spot<': '>⭐ Rate this spot<',
    'class="rated-badge">?You rated': 'class="rated-badge">✓ You rated',
    '次浏�?/': '次浏览</',
    '>?Facilities<': '>🏗️ Facilities<',
    'class="wfc-rating">?{{': 'class="wfc-rating">⭐ {{',
    "|| '? }}": "|| '—' }}",
    '🏞�?/span>': '🏞️</span>',
    '· ?{{ s.avgRating': '· ⭐ {{ s.avgRating',
    '>?{{ r.rating }}/5<': '>⭐ {{ r.rating }}/5<',
    'expired �?please': 'expired — please',
    # facilityIcon and categoryLabels corrupted emoji
}

for old, new in corruptions.items():
    if old in text:
        text = text.replace(old, new)
        print(f"Fixed: {old[:30]}")

# Fix the specific function lines that have corrupted emoji
# Line 219: facilityIcon PARKING
text = text.replace("PARKING: '\ufffd\ufffd?'", "PARKING: '\U0001f17e\ufe0f'")
text = text.replace("PARKING: '\ufffd\ufffd'", "PARKING: '\U0001f17e\ufe0f'")

# CAFE corrupted
text = text.replace("CAFE: '\ufffd?'", "CAFE: '\u2615'")
text = text.replace("CAFE: '\ufffd'", "CAFE: '\u2615'")

# RESTAURANT corrupted  
text = text.replace("RESTAURANT: '\ufffd\ufffd?'", "RESTAURANT: '\U0001f37d\ufe0f'")
text = text.replace("RESTAURANT: '\ufffd\ufffd'", "RESTAURANT: '\U0001f37d\ufe0f'")

# AED heart
text = text.replace("AED: '\ufffd\ufffd'", "AED: '\u2764\ufe0f'")

# categoryLabels corruption
text = text.replace("PARKING: '\ufffd\ufffd?Parking'", "PARKING: '\U0001f17e\ufe0f Parking'")
text = text.replace("PARKING: '\ufffd\ufffd Parking'", "PARKING: '\U0001f17e\ufe0f Parking'")
text = text.replace("CAFE: '\ufffd?Cafes'", "CAFE: '\u2615 Cafes'")
text = text.replace("CAFE: '\ufffd Cafes'", "CAFE: '\u2615 Cafes'")

# Also fix any remaining \ufffd patterns
text = text.replace('\ufffd\ufffd\ufffd\ufffd\ufffd', '')
text = text.replace('\ufffd\ufffd\ufffd\ufffd', '')
text = text.replace('\ufffd\ufffd\ufffd', '')
text = text.replace('\ufffd\ufffd', '')
text = text.replace('\ufffd', '?')

with open('D:\\JC\\frontend\\src\\views\\spot\\SpotDetailView.vue', 'w', encoding='utf-8') as f:
    f.write(text)

print("\nDone! Fixed corrupted characters.")
