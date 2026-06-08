import subprocess

js_code = '''
const fs = require('fs');
const { parse: sfcParse } = require('@vue/compiler-sfc');

const src = fs.readFileSync('src/views/navigation/NavigationView.vue', 'utf-8');

// Test 1: remove emoji
const noEmoji = src.replace(
  '\\u{1f3db}',
  ''
);
try {
  sfcParse(noEmoji);
  console.log('Test 1 (no emoji): OK');
} catch(e) {
  console.log('Test 1 (no emoji): FAIL -', e.message);
}

// Test 2: replace @click.stop in SVG g with something else
const noClick = src.replace(
  '@click.stop="selectIndoorNode(n)"',
  'data-test="node"'
);
try {
  sfcParse(noClick);
  console.log('Test 2 (no @click): OK');
} catch(e) {
  console.log('Test 2 (no @click): FAIL -', e.message);
}

// Test 3: replace v-else-if with separate v-if
const noElseIf = src.replace(
  '<polygon v-else-if="n.type === \\'ENTRANCE\\'"',
  '<polygon v-if="n.type === \\'ENTRANCE\\'"'
);
try {
  sfcParse(noElseIf);
  console.log('Test 3 (no v-else-if): OK');
} catch(e) {
  console.log('Test 3 (no v-else-if): FAIL -', e.message);
}

// Test 4: simplify the SVG to just one rectangle
const simpleSvg = src.replace(
  /<svg :viewBox="indoorSvgViewBox" class="indoor-svg" xmlns="http:\\/\\/www\\.w3\\.org\\/2000\\/svg">[\\s\\S]*?<\\/svg>/,
  '<svg><rect x="0" y="0" width="10" height="10" /></svg>'
);
try {
  sfcParse(simpleSvg);
  console.log('Test 4 (simple SVG): OK');
} catch(e) {
  console.log('Test 4 (simple SVG): FAIL -', e.message);
}

console.log('All tests done');
'''

with open(r'D:\JC\scripts\test_build.js', 'w', encoding='utf-8') as f:
    f.write(js_code)

result = subprocess.run(['node', r'D:\JC\scripts\test_build.js'], cwd=r'D:\JC\frontend', capture_output=True, text=True)
print(result.stdout)
if result.stderr:
    print('STDERR:', result.stderr)
