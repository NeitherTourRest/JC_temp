import subprocess, json

# Write the test script
test_js = r'''
const fs = require('fs');
const path = require('path');
const { parse: sfcParse } = require(path.resolve(process.cwd(), 'node_modules/@vue/compiler-sfc'));

const src = fs.readFileSync(path.resolve(process.cwd(), 'src/views/navigation/NavigationView.vue'), 'utf-8');
const dialogStart = src.indexOf('<el-dialog');
const dialogEnd = src.indexOf('</el-dialog>', dialogStart) + '</el-dialog>'.length;
const dialogContent = src.substring(dialogStart, dialogEnd);

// Minimal dialog test
const minimal = src.replace(dialogContent,
  '<el-dialog v-model="indoorDialogVisible" title="Test" width="70%">\n  <div>test</div>\n</el-dialog>');
try {
  sfcParse(minimal);
  console.log('1: minimal dialog OK');
} catch(e) {
  console.log('1: FAIL -', e.message);
  process.exit(1);
}

// Add back the indoor-plan-wrap structure
const withWrap = src.replace(dialogContent,
  '<el-dialog v-model="indoorDialogVisible" title="Test" width="70%">\n' +
  '  <div class="indoor-dialog-body">\n' +
  '    <div class="indoor-left">\n' +
  '      <div class="indoor-floor-bar">\n' +
  '        <button v-for="f in indoorFloors" :key="f" :class="[\'floor-tab\', { active: indoorFloor === f }]">\n' +
  '          {{ f }}\n' +
  '        </button>\n' +
  '      </div>\n' +
  '      <div class="indoor-plan-wrap">\n' +
  '        <div>placeholder</div>\n' +
  '      </div>\n' +
  '    </div>\n' +
  '  </div>\n' +
  '</el-dialog>');
try {
  sfcParse(withWrap);
  console.log('2: with wrap OK');
} catch(e) {
  console.log('2: FAIL -', e.message);
  process.exit(1);
}

// Add back the SVG
const withSvg = src.replace(dialogContent,
  '<el-dialog v-model="indoorDialogVisible" title="Test" width="70%">\n' +
  '  <div class="indoor-dialog-body">\n' +
  '    <div class="indoor-left">\n' +
  '      <div class="indoor-floor-bar">\n' +
  '        <button v-for="f in indoorFloors" :key="f" :class="[\'floor-tab\', { active: indoorFloor === f }]">\n' +
  '          {{ f }}\n' +
  '        </button>\n' +
  '      </div>\n' +
  '      <div class="indoor-plan-wrap">\n' +
  '        <svg :viewBox="indoorSvgViewBox" class="indoor-svg">\n' +
  '          <rect x="0" y="0" width="100" height="100" />\n' +
  '        </svg>\n' +
  '      </div>\n' +
  '    </div>\n' +
  '  </div>\n' +
  '</el-dialog>');
try {
  sfcParse(withSvg);
  console.log('3: with SVG OK');
} catch(e) {
  console.log('3: FAIL -', e.message);
  process.exit(1);
}

// Add edges
const withEdges = src.replace(dialogContent,
  '<el-dialog v-model="indoorDialogVisible" title="Test" width="70%">\n' +
  '  <div class="indoor-dialog-body">\n' +
  '    <div class="indoor-left">\n' +
  '      <div class="indoor-floor-bar">\n' +
  '        <button v-for="f in indoorFloors" :key="f" :class="[\'floor-tab\', { active: indoorFloor === f }]">\n' +
  '          {{ f }}\n' +
  '        </button>\n' +
  '      </div>\n' +
  '      <div class="indoor-plan-wrap">\n' +
  '        <svg :viewBox="indoorSvgViewBox" class="indoor-svg">\n' +
  '          <line v-for="e in indoorFloorEdges" :key="e.from + e.to"\n' +
  '            :x1="indoorNodeCoord(e.from).x" :y1="indoorNodeCoord(e.from).y"\n' +
  '            :x2="indoorNodeCoord(e.to).x" :y2="indoorNodeCoord(e.to).y"\n' +
  '            class="indoor-edge" />\n' +
  '        </svg>\n' +
  '      </div>\n' +
  '    </div>\n' +
  '  </div>\n' +
  '</el-dialog>');
try {
  sfcParse(withEdges);
  console.log('4: with edges OK');
} catch(e) {
  console.log('4: FAIL -', e.message);
  process.exit(1);
}

// Add g with v-for for nodes (critical test)
const withNodes = src.replace(dialogContent,
  '<el-dialog v-model="indoorDialogVisible" title="Test" width="70%">\n' +
  '  <div class="indoor-dialog-body">\n' +
  '    <div class="indoor-left">\n' +
  '      <div class="indoor-floor-bar">\n' +
  '        <button v-for="f in indoorFloors" :key="f" :class="[\'floor-tab\', { active: indoorFloor === f }]">\n' +
  '          {{ f }}\n' +
  '        </button>\n' +
  '      </div>\n' +
  '      <div class="indoor-plan-wrap">\n' +
  '        <svg :viewBox="indoorSvgViewBox" class="indoor-svg">\n' +
  '          <line v-for="e in indoorFloorEdges" :key="e.from + e.to" class="indoor-edge"\n' +
  '            :x1="indoorNodeCoord(e.from).x" :y1="indoorNodeCoord(e.from).y"\n' +
  '            :x2="indoorNodeCoord(e.to).x" :y2="indoorNodeCoord(e.to).y" />\n' +
  '          <g v-for="n in indoorNodesOnFloor" :key="n.id" class="indoor-svg-node"\n' +
  '            :transform="\'translate(\' + n.x + \',\' + n.y + \')\'"\n' +
  '            @click.stop="selectIndoorNode(n)">\n' +
  '            <rect v-if="n.type === \'STAIRS\' || n.type === \'ELEVATOR\'"\n' +
  '              x="-8" y="-8" width="16" height="16" rx="3"\n' +
  '              :class="\'node-shape-\' + indoorNodeType(n.type)" />\n' +
  '            <polygon v-else-if="n.type === \'ENTRANCE\'"\n' +
  '              points="-10,8 0,-10 10,8"\n' +
  '              :class="\'node-shape-\' + indoorNodeType(n.type)" />\n' +
  '            <rect v-else x="-6" y="-6" width="12" height="12"\n' +
  '              :class="\'node-shape-\' + indoorNodeType(n.type)" />\n' +
  '            <text x="12" y="4" class="indoor-node-label">{{ n.name }}</text>\n' +
  '          </g>\n' +
  '        </svg>\n' +
  '      </div>\n' +
  '    </div>\n' +
  '  </div>\n' +
  '</el-dialog>');
try {
  sfcParse(withNodes);
  console.log('5: with nodes OK');
} catch(e) {
  console.log('5: FAIL at -', e.message);
  process.exit(1);
}

console.log('ALL TESTS PASSED');
'''

fs.writeFileSync('D:\\JC\\scripts\\test_vue.js', test_js);
console.log('Test script written');
