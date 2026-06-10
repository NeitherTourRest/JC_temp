with open('D:\\JC\\frontend\\src\\views\\spot\\SpotDetailView.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix corrupted emoji characters from encoding damage
replacements = [
    ("return m[congestionLevel.value] || '\ufffd?'", "return m[congestionLevel.value] || ''"),
    ("PARKING: '\ud83d\udeb0\ufffd?'", "PARKING: '\U0001f17e\ufe0f'"),
    ("CAFE: '\ufffd?'", "CAFE: '\u2615'"),
    ("RESTAURANT: '\ud83c\udf7d\ufffd?'", "RESTAURANT: '\U0001f37d\ufe0f'"),
]

for old, new in replacements:
    content = content.replace(old, new)

with open('D:\\JC\\frontend\\src\\views\\spot\\SpotDetailView.vue', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed!")
