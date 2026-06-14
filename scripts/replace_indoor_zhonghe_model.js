const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const BUILDING_ID = 'BUPT_ZHONGHE_ZONGHE'
const FLOORS = [1, 2, 3, 4, 5]

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function floorCode(level) {
  return `F${level}`
}

function addNode(nodes, node) {
  if (nodes.some((entry) => entry.id === node.id)) {
    throw new Error(`Duplicate node id: ${node.id}`)
  }
  nodes.push(node)
  return node.id
}

function addEdge(edges, edge) {
  if (edge.from === edge.to) throw new Error(`Self edge: ${edge.from}`)
  const exists = edges.some(
    (entry) =>
      (entry.from === edge.from && entry.to === edge.to) ||
      (entry.from === edge.to && entry.to === edge.from)
  )
  if (!exists) edges.push(edge)
}

function corridorNode(level, wing, zone, label, x, y) {
  return {
    id: `${floorCode(level)}-${wing}-${zone}`,
    floor: floorCode(level),
    x,
    y,
    name: `${level}层${label}`,
    type: 'CORRIDOR',
    wing,
    zone: zone.toLowerCase(),
    accessible: true,
  }
}

function publicNode(level, idPart, name, type, x, y, wing, zone, accessible = true) {
  return {
    id: `${floorCode(level)}-${idPart}`,
    floor: floorCode(level),
    x,
    y,
    name: `${level}层${name}`,
    type,
    wing,
    zone,
    accessible,
  }
}

function isHighRightFloor(level) {
  return level >= 3
}

function corridorNodesForFloor(level) {
  const nodes = [
    corridorNode(level, 'N', 'WEST-ENTRY', '北翼西入口走廊', 80, 120),
    corridorNode(level, 'N', 'WEST-MID', '北翼西段走廊', 210, 120),
    corridorNode(level, 'N', 'CENTER-STAIR-HALL', '北翼中部楼梯厅', 380, 120),
    corridorNode(level, 'N', 'MID', '北翼中段走廊', 530, 120),
    corridorNode(level, 'N', 'EAST-MID', '北翼东段走廊', 700, 120),
    corridorNode(level, 'N', 'EAST-TURN', '北翼东侧转折口', 840, 120),
    corridorNode(level, 'S', 'WEST-ENTRY', '南翼西入口走廊', 90, 430),
    corridorNode(level, 'S', 'WEST-MID', '南翼西段走廊', 225, 430),
    corridorNode(level, 'S', 'CENTER-STAIR-HALL', '南翼中部楼梯厅', 390, 430),
    corridorNode(level, 'S', 'MID', '南翼中段走廊', 540, 430),
    corridorNode(level, 'S', 'EAST-MID', '南翼东段走廊', 705, 430),
    corridorNode(level, 'S', 'EAST-TURN', '南翼东侧转折口', 845, 430),
  ]

  if (isHighRightFloor(level)) {
    nodes.push(
      corridorNode(level, 'RIGHT', 'BRIDGE-TO-N', '右侧连接区北入口', 900, 145),
      corridorNode(level, 'RIGHT', 'V-HALL-N1', '右侧竖向走廊北段', 930, 195),
      corridorNode(level, 'RIGHT', 'V-HALL-N2', '右侧竖向走廊上中段', 930, 255),
      corridorNode(level, 'RIGHT', 'V-HALL-CENTER', '右侧竖向走廊中段', 930, 315),
      corridorNode(level, 'RIGHT', 'V-HALL-S1', '右侧竖向走廊下中段', 930, 375),
      corridorNode(level, 'RIGHT', 'V-HALL-S2', '右侧竖向走廊南段', 930, 425),
      corridorNode(level, 'RIGHT', 'BRIDGE-TO-S', '右侧连接区南入口', 900, 455)
    )
  } else {
    nodes.push(
      corridorNode(level, 'RIGHT', 'V-HALL-TOP', '东侧竖向通道北段', 900, 175),
      corridorNode(level, 'RIGHT', 'V-HALL-BOTTOM', '东侧竖向通道南段', 900, 385)
    )
  }

  return nodes
}

function publicNodesForFloor(level) {
  const nodes = [
    publicNode(level, 'CENTER-N-STAIR', '北翼中部楼梯', 'STAIRS', 390, 80, 'N', 'stair-hall', false),
    publicNode(level, 'CENTER-S-STAIR', '南翼中部楼梯', 'STAIRS', 400, 470, 'S', 'stair-hall', false),
    publicNode(level, 'EAST-STAIR', '东侧楼梯', 'STAIRS', 975, 430, 'RIGHT', 'right-vertical', false),
    publicNode(level, 'EAST-ELEVATOR', '东侧电梯', 'ELEVATOR', 875, 360, 'RIGHT', 'right-vertical', true),
    publicNode(level, 'N-TOILET-ENTRY', '北翼卫生间入口', 'TOILET', 760, 155, 'N', 'east', true),
    publicNode(level, 'S-TOILET-ENTRY', '南翼卫生间入口', 'TOILET', 760, 395, 'S', 'east', true),
  ]

  if (level === 1) {
    nodes.push(
      publicNode(level, 'N-WEST-EXIT', '北翼西出口', 'EXIT', 25, 120, 'N', 'west', true),
      publicNode(level, 'S-WEST-EXIT', '南翼西出口', 'EXIT', 30, 430, 'S', 'west', true),
      publicNode(level, 'CENTER-N-EXIT', '北翼中部出口', 'EXIT', 430, 70, 'N', 'stair-hall', true),
      publicNode(level, 'CENTER-S-EXIT', '南翼中部出口', 'EXIT', 440, 485, 'S', 'stair-hall', true),
      publicNode(level, 'EAST-N-EXIT', '东侧北出口', 'EXIT', 1015, 175, 'RIGHT', 'right-vertical', true),
      publicNode(level, 'EAST-S-EXIT', '东侧南出口', 'EXIT', 1015, 430, 'RIGHT', 'right-vertical', true)
    )
  }

  return nodes
}

function addCorridorEdges(level, edges) {
  const floor = floorCode(level)
  const link = (from, to, dist) =>
    addEdge(edges, { from: `${floor}-${from}`, to: `${floor}-${to}`, dist, floor, type: 'CORRIDOR', accessible: true })

  link('N-WEST-ENTRY', 'N-WEST-MID', 14)
  link('N-WEST-MID', 'N-CENTER-STAIR-HALL', 18)
  link('N-CENTER-STAIR-HALL', 'N-MID', 16)
  link('N-MID', 'N-EAST-MID', 18)
  link('N-EAST-MID', 'N-EAST-TURN', 14)
  link('S-WEST-ENTRY', 'S-WEST-MID', 14)
  link('S-WEST-MID', 'S-CENTER-STAIR-HALL', 18)
  link('S-CENTER-STAIR-HALL', 'S-MID', 16)
  link('S-MID', 'S-EAST-MID', 18)
  link('S-EAST-MID', 'S-EAST-TURN', 14)

  if (isHighRightFloor(level)) {
    link('N-EAST-TURN', 'RIGHT-BRIDGE-TO-N', 7)
    link('RIGHT-BRIDGE-TO-N', 'RIGHT-V-HALL-N1', 6)
    link('RIGHT-V-HALL-N1', 'RIGHT-V-HALL-N2', 8)
    link('RIGHT-V-HALL-N2', 'RIGHT-V-HALL-CENTER', 8)
    link('RIGHT-V-HALL-CENTER', 'RIGHT-V-HALL-S1', 8)
    link('RIGHT-V-HALL-S1', 'RIGHT-V-HALL-S2', 8)
    link('RIGHT-V-HALL-S2', 'RIGHT-BRIDGE-TO-S', 6)
    link('RIGHT-BRIDGE-TO-S', 'S-EAST-TURN', 7)
  } else {
    link('N-EAST-TURN', 'RIGHT-V-HALL-TOP', 8)
    link('RIGHT-V-HALL-TOP', 'RIGHT-V-HALL-BOTTOM', 26)
    link('RIGHT-V-HALL-BOTTOM', 'S-EAST-TURN', 8)
  }
}

function addPublicEdges(level, edges) {
  const floor = floorCode(level)
  const link = (from, to, dist, type = 'CONNECTOR', accessible = true) =>
    addEdge(edges, { from: `${floor}-${from}`, to: `${floor}-${to}`, dist, floor, type, accessible })

  link('N-CENTER-STAIR-HALL', 'CENTER-N-STAIR', 4, 'STAIRS_LINK', false)
  link('S-CENTER-STAIR-HALL', 'CENTER-S-STAIR', 4, 'STAIRS_LINK', false)
  link(isHighRightFloor(level) ? 'RIGHT-V-HALL-S2' : 'RIGHT-V-HALL-BOTTOM', 'EAST-STAIR', 5, 'STAIRS_LINK', false)
  link(isHighRightFloor(level) ? 'RIGHT-V-HALL-S1' : 'RIGHT-V-HALL-BOTTOM', 'EAST-ELEVATOR', 5, 'ELEVATOR_LINK', true)
  link('N-EAST-MID', 'N-TOILET-ENTRY', 5, 'TOILET_LINK', true)
  link('S-EAST-MID', 'S-TOILET-ENTRY', 5, 'TOILET_LINK', true)

  if (level === 1) {
    link('N-WEST-ENTRY', 'N-WEST-EXIT', 5, 'EXIT_LINK', true)
    link('S-WEST-ENTRY', 'S-WEST-EXIT', 5, 'EXIT_LINK', true)
    link('N-CENTER-STAIR-HALL', 'CENTER-N-EXIT', 5, 'EXIT_LINK', true)
    link('S-CENTER-STAIR-HALL', 'CENTER-S-EXIT', 5, 'EXIT_LINK', true)
    link(isHighRightFloor(level) ? 'RIGHT-V-HALL-N1' : 'RIGHT-V-HALL-TOP', 'EAST-N-EXIT', 6, 'EXIT_LINK', true)
    link(isHighRightFloor(level) ? 'RIGHT-V-HALL-S2' : 'RIGHT-V-HALL-BOTTOM', 'EAST-S-EXIT', 6, 'EXIT_LINK', true)
  }
}

function roomRanges(level) {
  if (level === 1) return { N: range(101, 120), S: range(101, 120) }
  if (level === 2) return { N: range(201, 218), S: range(201, 217) }
  if (level === 3) return { N: range(301, 330), S: range(301, 320) }
  if (level === 4) return { N: range(401, 427), S: [...range(401, 416), ...range(418, 424)] }
  return { N: range(501, 527), S: range(501, 525) }
}

function anchorForRoom(level, wing, roomNumber) {
  const lastTwo = roomNumber % 100
  if (lastTwo <= 2) return `${floorCode(level)}-${wing}-WEST-ENTRY`
  if (lastTwo <= 6) return `${floorCode(level)}-${wing}-WEST-MID`
  if (lastTwo <= 10) return `${floorCode(level)}-${wing}-CENTER-STAIR-HALL`
  if (lastTwo <= 14) return `${floorCode(level)}-${wing}-MID`
  if (lastTwo <= 18) return `${floorCode(level)}-${wing}-EAST-MID`
  if (lastTwo <= 20) return `${floorCode(level)}-${wing}-EAST-TURN`

  if (!isHighRightFloor(level)) return `${floorCode(level)}-${wing}-EAST-TURN`
  if (lastTwo <= 22) return `${floorCode(level)}-RIGHT-V-HALL-N1`
  if (lastTwo <= 24) return `${floorCode(level)}-RIGHT-V-HALL-N2`
  if (lastTwo <= 26) return `${floorCode(level)}-RIGHT-V-HALL-CENTER`
  if (lastTwo <= 28) return `${floorCode(level)}-RIGHT-V-HALL-S1`
  return `${floorCode(level)}-RIGHT-V-HALL-S2`
}

function nodeById(nodes, id) {
  const node = nodes.find((entry) => entry.id === id)
  if (!node) throw new Error(`Missing anchor node: ${id}`)
  return node
}

function zoneFromAnchor(anchorId) {
  if (anchorId.includes('WEST')) return 'west'
  if (anchorId.includes('MID')) return 'mid'
  if (anchorId.includes('EAST')) return 'east'
  if (anchorId.includes('RIGHT')) return 'right-vertical'
  return 'mid'
}

function horizontalRoomXRange(anchorNodeId) {
  if (anchorNodeId.includes('WEST-ENTRY')) return [55, 125]
  if (anchorNodeId.includes('WEST-MID')) return [150, 275]
  if (anchorNodeId.includes('CENTER-STAIR-HALL')) return [320, 455]
  if (anchorNodeId.includes('EAST-MID')) return [650, 775]
  if (anchorNodeId.includes('-MID')) return [475, 600]
  if (anchorNodeId.includes('EAST-TURN')) return [810, 875]
  return null
}

function roomsForAnchor(level, wing, anchorNodeId) {
  return roomRanges(level)[wing].filter(
    (roomNumber) => anchorForRoom(level, wing, roomNumber) === anchorNodeId
  )
}

function roomPlacement(level, wing, roomNumber, anchorNodeId, anchor) {
  if (anchorNodeId.includes('-RIGHT-')) {
    const placeLeft = roomNumber % 2 === 1
    const yNudge = Math.floor(roomNumber / 2) % 2 === 0 ? -8 : 8
    return {
      doorX: anchor.x + (placeLeft ? -8 : 8),
      doorY: anchor.y + yNudge,
      roomX: anchor.x + (placeLeft ? -54 : 54),
      roomY: anchor.y + yNudge,
    }
  }

  const range = horizontalRoomXRange(anchorNodeId)
  if (!range) {
    return { doorX: anchor.x, doorY: anchor.y, roomX: anchor.x, roomY: anchor.y + (wing === 'N' ? -44 : 44) }
  }

  const groupedRooms = roomsForAnchor(level, wing, anchorNodeId)
  const roomIndex = Math.max(groupedRooms.indexOf(roomNumber), 0)
  const [startX, endX] = range
  const x = startX + ((endX - startX) * (roomIndex + 1)) / (groupedRooms.length + 1)
  const roomAboveCorridor = roomIndex % 2 === 0
  const side = roomAboveCorridor ? -1 : 1

  return {
    doorX: Math.round(x),
    doorY: anchor.y + side * 7,
    roomX: Math.round(x),
    roomY: anchor.y + side * 48,
  }
}

function addRoomsForFloor(level, nodes, edges) {
  const floor = floorCode(level)
  const ranges = roomRanges(level)

  for (const wing of ['N', 'S']) {
    for (const roomNumber of ranges[wing]) {
      const roomLabel = `${wing}-${roomNumber}`
      const anchorNodeId = anchorForRoom(level, wing, roomNumber)
      const anchor = nodeById(nodes, anchorNodeId)
      const doorNodeId = `DOOR-${floor}-${roomLabel}`
      const roomNodeId = `ROOM-${floor}-${roomLabel}`
      const placement = roomPlacement(level, wing, roomNumber, anchorNodeId, anchor)

      addNode(nodes, {
        id: doorNodeId,
        floor,
        x: placement.doorX,
        y: placement.doorY,
        name: `${roomLabel}门口`,
        type: 'DOOR',
        wing,
        zone: zoneFromAnchor(anchorNodeId),
        anchorNodeId,
        accessible: true,
        aliases: [roomLabel, `${roomNumber}`],
      })
      addNode(nodes, {
        id: roomNodeId,
        floor,
        x: placement.roomX,
        y: placement.roomY,
        name: roomLabel,
        type: 'CLASSROOM',
        wing,
        zone: zoneFromAnchor(anchorNodeId),
        roomCategory: 'classroom',
        anchorNodeId,
        doorNodeId,
        accessible: true,
        aliases: [roomLabel, `${roomNumber}`],
      })
      addEdge(edges, { from: anchorNodeId, to: doorNodeId, dist: 2, floor, type: 'DOOR_LINK', accessible: true })
      addEdge(edges, { from: doorNodeId, to: roomNodeId, dist: 1, floor, type: 'ROOM_LINK', accessible: true })
    }
  }
}

function buildTargetDoc() {
  const nodes = []
  const edges = []
  const crossFloorEdges = []

  for (const level of FLOORS) {
    for (const node of corridorNodesForFloor(level)) addNode(nodes, node)
    for (const node of publicNodesForFloor(level)) addNode(nodes, node)
    addCorridorEdges(level, edges)
    addPublicEdges(level, edges)
    addRoomsForFloor(level, nodes, edges)
  }

  for (const level of FLOORS.slice(0, -1)) {
    const current = floorCode(level)
    const next = floorCode(level + 1)
    for (const idPart of ['CENTER-N-STAIR', 'CENTER-S-STAIR', 'EAST-STAIR']) {
      crossFloorEdges.push({
        from: `${current}-${idPart}`,
        to: `${next}-${idPart}`,
        type: 'STAIRS',
        dist: 6,
      })
    }
    crossFloorEdges.push({
      from: `${current}-EAST-ELEVATOR`,
      to: `${next}-EAST-ELEVATOR`,
      type: 'ELEVATOR',
      dist: 4,
    })
  }

  return {
    buildingId: BUILDING_ID,
    buildingName: '综合实验教学楼',
    sourceModelName: '综合实验教学楼 F1-F5 拓扑导航图',
    sourceModelId: 'bupt-shahe-teaching-lab-complex-v2',
    campus: '北京邮电大学沙河校区',
    location: { lng: 116.29221, lat: 40.15827 },
    floors: FLOORS.map(floorCode),
    floorPlans: Object.fromEntries(
      FLOORS.map((level) => [floorCode(level), `/images/indoor/${BUILDING_ID}/${floorCode(level)}.jpg`])
    ),
    nodes,
    edges,
    crossFloorEdges,
    updatedAt: new Date().toISOString(),
  }
}

function validateDoc(doc) {
  const ids = new Set(doc.nodes.map((node) => node.id))
  for (const edge of [...doc.edges, ...doc.crossFloorEdges]) {
    if (!ids.has(edge.from)) throw new Error(`Edge source missing: ${edge.from}`)
    if (!ids.has(edge.to)) throw new Error(`Edge target missing: ${edge.to}`)
  }
}

function dockerMongoEval(js) {
  return execFileSync(
    'docker',
    ['exec', '-i', 'journeycraft-mongodb', 'mongosh', '--quiet'],
    { encoding: 'utf8', input: js }
  )
}

function lastPrintedJson(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^[^>]*>\s?/, '').trim())
    .filter(Boolean)
  return lines.at(-1) || ''
}

function main() {
  const doc = buildTargetDoc()
  validateDoc(doc)

  const dryRun = process.argv.includes('--dry-run')
  const outIndex = process.argv.indexOf('--out')
  if (outIndex >= 0) {
    const outPath = path.resolve(process.argv[outIndex + 1])
    fs.writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`)
    console.log(`Written to ${outPath}`)
    process.exit(0)
  }

  const summary = {
    buildingId: doc.buildingId,
    buildingName: doc.buildingName,
    floors: doc.floors,
    nodeCount: doc.nodes.length,
    edgeCount: doc.edges.length,
    crossFloorEdgeCount: doc.crossFloorEdges.length,
    roomCount: doc.nodes.filter((node) => node.type === 'CLASSROOM').length,
    doorCount: doc.nodes.filter((node) => node.type === 'DOOR').length,
  }

  if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, summary }, null, 2))
    return
  }

  const backupDir = path.join(process.cwd(), 'docs', 'backups', 'indoor_navigation')
  fs.mkdirSync(backupDir, { recursive: true })
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(backupDir, `${BUILDING_ID}_${timestamp}.json`)

  const currentDocJson = lastPrintedJson(dockerMongoEval(
    `const doc = db.getSiblingDB("JourneyCraft").indoor_navigation.findOne({buildingId:"${BUILDING_ID}"}); print(JSON.stringify(doc));`
  ))
  if (currentDocJson && currentDocJson !== 'null') {
    fs.writeFileSync(backupPath, `${currentDocJson}\n`)
  }

  const replaceScript = `
    const doc = ${JSON.stringify(doc)};
    const dbRef = db.getSiblingDB("JourneyCraft");
    dbRef.indoor_navigation.replaceOne(
      { buildingId: "${BUILDING_ID}" },
      doc,
      { upsert: true }
    );
    const saved = dbRef.indoor_navigation.findOne(
      { buildingId: "${BUILDING_ID}" },
      { _id: 0, buildingId: 1, buildingName: 1, campus: 1, floors: 1, sourceModelName: 1 }
    );
    print(JSON.stringify(saved));
  `
  const replaceResult = lastPrintedJson(dockerMongoEval(replaceScript))

  console.log(
    JSON.stringify(
      {
        backupPath: fs.existsSync(backupPath) ? backupPath : null,
        summary,
        saved: replaceResult ? JSON.parse(replaceResult) : null,
      },
      null,
      2
    )
  )
}

main()
