with open('D:\\JC\\frontend\\src\\views\\spot\\SpotDetailView.vue', 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

# Fix known corrupted lines by line number (0-indexed)
# Line 213 (index 213) should be the congestionIcon return
fixes = {
    213: "  return m[congestionLevel.value] || ''\n",
}

# Find and fix facilityIcon line with PARKING corruption
for i, line in enumerate(lines):
    if 'TOILET' in line and 'PARKING' in line:
        lines[i] = "    TOILET: '\U0001f6bd', PARKING: '\U0001f17e\ufe0f', SERVICE: '\U0001f527', SHOP: '\U0001f3ea',\n"
    if 'CAFE' in line and '\u2615' not in line and 'CAFE' not in line.replace('\ufffd',''):
        lines[i] = "    CAFE: '\u2615', HOSPITAL: '\U0001f3e5', AED: '\u2764\ufe0f', ATM: '\U0001f3e7', INFO: '\u2139\ufe0f', RESTAURANT: '\U0001f37d\ufe0f',\n"
    if '\ufffd' in line or '\uFFFD' in line:
        print(f"Corrupted line {i}: {line.rstrip()[:60]}")

# Apply specific fixes
for idx, new_content in fixes.items():
    if idx < len(lines) and lines[idx] != new_content:
        lines[idx] = new_content
        print(f"Fixed line {idx}")

with open('D:\\JC\\frontend\\src\\views\\spot\\SpotDetailView.vue', 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Done!")
