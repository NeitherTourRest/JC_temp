const fs = require('fs');
const path = require('path');
const projectDir = path.resolve(__dirname, '..', 'frontend');
const { parse: sfcParse } = require(path.join(projectDir, 'node_modules/@vue/compiler-sfc'));

const src = fs.readFileSync(path.join(projectDir, 'src/views/navigation/NavigationView.vue'), 'utf-8');

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

// Original SVG content
const origSvg = src.substring(divStart, divEnd);

// Test 1: SVG with just svg tag
let test = src.substring(0, divStart) + '<div class="indoor-plan-wrap"><svg viewBox="0 0 100 100"></svg></div>' + src.substring(divEnd);
sfcParse(test) ? console.log('Test 1 (empty svg): PASS') : console.log('Test 1: FAIL');

// Test 2: Add line with v-for
test = src.substring(0, divStart) + '<div class="indoor-plan-wrap"><svg viewBox="0 0 2000 2000"><line v-for="e in indoorFloorEdges" :key="e.from+e.to" :x1="0" :y1="0" :x2="10" :y2="10" /></svg></div>' + src.substring(divEnd);
try { sfcParse(test); console.log('Test 2 (v-for line): PASS'); } catch(e) { console.log('Test 2: FAIL -', e.message); }

// Test 3: Add g with v-for
test = src.substring(0, divStart) + '<div class="indoor-plan-wrap"><svg viewBox="0 0 2000 2000"><g v-for="n in indoorNodesOnFloor" :key="n.id"><rect x="0" y="0" width="10" height="10" /></g></svg></div>' + src.substring(divEnd);
try { sfcParse(test); console.log('Test 3 (v-for g): PASS'); } catch(e) { console.log('Test 3: FAIL -', e.message); }

// Test 4: Add v-if on rect inside g
test = src.substring(0, divStart) + '<div class="indoor-plan-wrap"><svg viewBox="0 0 2000 2000"><g v-for="n in indoorNodesOnFloor" :key="n.id"><rect v-if="n.type === \'STAIRS\'" x="0" y="0" width="10" height="10" /></g></svg></div>' + src.substring(divEnd);
try { sfcParse(test); console.log('Test 4 (v-if rect): PASS'); } catch(e) { console.log('Test 4: FAIL -', e.message); }

// Test 5: v-if with || operator
test = src.substring(0, divStart) + '<div class="indoor-plan-wrap"><svg viewBox="0 0 2000 2000"><g v-for="n in indoorNodesOnFloor" :key="n.id"><rect v-if="n.type === \'STAIRS\' || n.type === \'ELEVATOR\'" x="0" y="0" width="10" height="10" /></g></svg></div>' + src.substring(divEnd);
try { sfcParse(test); console.log('Test 5 (v-if ||): PASS'); } catch(e) { console.log('Test 5: FAIL -', e.message); }

// Test 6: v-else-if
test = src.substring(0, divStart) + '<div class="indoor-plan-wrap"><svg viewBox="0 0 2000 2000"><g v-for="n in indoorNodesOnFloor" :key="n.id"><rect v-if="n.type === \'STAIRS\'" x="0" y="0" width="10" height="10" /><polygon v-else-if="n.type === \'ENTRANCE\'" points="0,-10 10,10 -10,10" /></g></svg></div>' + src.substring(divEnd);
try { sfcParse(test); console.log('Test 6 (v-else-if): PASS'); } catch(e) { console.log('Test 6: FAIL -', e.message); }

// Test 7: points attribute with negative numbers
test = src.substring(0, divStart) + '<div class="indoor-plan-wrap"><svg viewBox="0 0 2000 2000"><g v-for="n in indoorNodesOnFloor" :key="n.id"><polygon points="-10,8 0,-10 10,8" /></g></svg></div>' + src.substring(divEnd);
try { sfcParse(test); console.log('Test 7 (negative points): PASS'); } catch(e) { console.log('Test 7: FAIL -', e.message); }

// Test 8: :class binding with template literal
test = src.substring(0, divStart) + '<div class="indoor-plan-wrap"><svg viewBox="0 0 2000 2000"><g v-for="n in indoorNodesOnFloor" :key="n.id"><rect :class="\'node-shape-\' + indoorNodeType(n.type)" x="0" y="0" width="10" height="10" /></g></svg></div>' + src.substring(divEnd);
try { sfcParse(test); console.log('Test 8 (:class +string): PASS'); } catch(e) { console.log('Test 8: FAIL -', e.message); }

// Test 9: :transform
test = src.substring(0, divStart) + '<div class="indoor-plan-wrap"><svg viewBox="0 0 2000 2000"><g v-for="n in indoorNodesOnFloor" :key="n.id" :transform="\'translate(\' + n.x + \',\' + n.y + \')\'"><rect x="0" y="0" width="10" height="10" /></g></svg></div>' + src.substring(divEnd);
try { sfcParse(test); console.log('Test 9 (:transform): PASS'); } catch(e) { console.log('Test 9: FAIL -', e.message); }

// Test 10: text element
test = src.substring(0, divStart) + '<div class="indoor-plan-wrap"><svg viewBox="0 0 2000 2000"><text x="10" y="10">{{ n.name }}</text></svg></div>' + src.substring(divEnd);
try { sfcParse(test); console.log('Test 10 (text): PASS'); } catch(e) { console.log('Test 10: FAIL -', e.message); }

// Test 11: Everything combined (full SVG)
test = src.substring(0, divStart) + '<div class="indoor-plan-wrap"><svg :viewBox="indoorSvgViewBox" class="indoor-svg">' +
  '<line v-for="e in indoorFloorEdges" :key="e.from+e.to" :x1="indoorNodeCoord(e.from).x" :y1="indoorNodeCoord(e.from).y" :x2="indoorNodeCoord(e.to).x" :y2="indoorNodeCoord(e.to).y" class="indoor-edge" />' +
  '<g v-for="n in indoorNodesOnFloor" :key="n.id" class="indoor-svg-node" :transform="\'translate(\' + n.x + \',\' + n.y + \')\'">' +
    '<rect v-if="n.type === \'STAIRS\' || n.type === \'ELEVATOR\'" x="-8" y="-8" width="16" height="16" rx="3" :class="\'node-shape-\' + indoorNodeType(n.type)" />' +
    '<polygon v-else-if="n.type === \'ENTRANCE\'" points="-10,8 0,-10 10,8" :class="\'node-shape-\' + indoorNodeType(n.type)" />' +
    '<rect v-else x="-6" y="-6" width="12" height="12" :class="\'node-shape-\' + indoorNodeType(n.type)" />' +
    '<text x="12" y="4" class="indoor-node-label">{{ n.name }}</text>' +
  '</g></svg></div>' + src.substring(divEnd);
try { sfcParse(test); console.log('Test 11 (full SVG): PASS'); } catch(e) { console.log('Test 11: FAIL -', e.message); }
