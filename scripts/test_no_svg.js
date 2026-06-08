const fs = require('fs');
const path = require('path');
const projectDir = path.resolve(__dirname, '..', 'frontend');
const { parse: sfcParse } = require(path.join(projectDir, 'node_modules/@vue/compiler-sfc'));

const src = fs.readFileSync(path.join(projectDir, 'src/views/navigation/NavigationView.vue'), 'utf-8');

// Remove just the SVG content inside indoor-plan-wrap
// Strategy: find "indoor-plan-wrap", then find the opening <div, then the matching </div>
const planWrapIdx = src.indexOf('indoor-plan-wrap');
const divStart = src.lastIndexOf('<div ', planWrapIdx);
let depth = 0;
let divEnd = divStart;
for (let i = divStart; i < src.length; i++) {
  if (src[i] === '<' && src[i+1] === '/' && src[i+2] === 'd' && src[i+3] === 'i' && src[i+4] === 'v' && src[i+5] === '>') {
    if (depth === 0) { divEnd = i + 6; break; }
    depth--;
  } else if (src[i] === '<' && src[i+1] === 'd' && src[i+2] === 'i' && src[i+3] === 'v' && src[i+4] !== '/' && src[i-1] !== '/') {
    depth++;
  }
}

// Replace the indoor-plan-wrap content with a simple div
const newSrc = src.substring(0, divStart) + '<div class="indoor-plan-wrap"><div>graph placeholder</div></div>' + src.substring(divEnd);

try {
  sfcParse(newSrc);
  console.log('PASS: SVG removed, parse OK');
} catch(e) {
  console.log('FAIL:', e.message);
}
