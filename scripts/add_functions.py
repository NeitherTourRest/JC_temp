with open(r'D:\JC\frontend\src\views\navigation\NavigationView.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the last catch block and insert the missing functions before </script>
script_close = content.rfind('</script>')

missing = '''

// ── Map initialization ──
function initMap() {
  if (!mapContainer.value) return
  try {
    AMapInstance = (window as any).AMap
    if (!AMapInstance) { setTimeout(initMap, 500); return }
    map = new AMapInstance.Map(mapContainer.value, { zoom: 15, center: [116.275, 40.155], resizeEnable: true })
    geocoder = new AMapInstance.Geocoder({})
    const buptMarker = new AMapInstance.Marker({
      position: [116.29221, 40.15827], title: '\u7efc\u5408\u5b9e\u9a8c\u6559\u5b66\u697c',
      label: { content: '\U0001f3db \u7efc\u5408\u5b9e\u9a8c\u6559\u5b66\u697c', offset: new AMapInstance.Pixel(0, -36) },
      extData: { isIndoor: true }
    })
    buptMarker.on('click', () => { indoorDialogVisible.value = true; if (!indoorNodes.value.length) loadIndoorNodes() })
    map.add(buptMarker)
    mapContainer.value.addEventListener('click', (e: MouseEvent) => {
      if (!pickingStart.value && pickingWaypointIdx.value === null) return
      const pixel = new AMapInstance.Pixel(e.offsetX, e.offsetY)
      const lnglat = map.containerToLngLat(pixel)
      if (!lnglat) return
      if (pickingStart.value) {
        setStartPoint(lnglat.lng, lnglat.lat)
        reverseGeocode(lnglat.lng, lnglat.lat, (n) => { if (startPoint.value) startPoint.value.name = n })
        pickingStart.value = false
      } else if (pickingWaypointIdx.value !== null) {
        const idx = pickingWaypointIdx.value
        setWaypoint(idx, lnglat.lng, lnglat.lat)
        reverseGeocode(lnglat.lng, lnglat.lat, (n) => { if (waypoints.value[idx]) waypoints.value[idx].name = n })
        pickingWaypointIdx.value = null
      }
    })
    mapReady.value = true
  } catch (e) { console.error('AMap init failed:', e); setTimeout(initMap, 1000) }
}

function reverseGeocode(lng: number, lat: number, cb: (name: string) => void) {
  if (!geocoder) { cb('\u5750\u6807\u70b9'); return }
  geocoder.getAddress([lng, lat], (status: string, result: any) => {
    cb(status === 'complete' && result.regeocode ? result.regeocode.formattedAddress || '\u5750\u6807\u70b9' : '\u5750\u6807\u70b9')
  })
}

function setStartPoint(lng: number, lat: number) {
  startPoint.value = { lng, lat }
  if (startMarker) map.remove(startMarker)
  startMarker = new AMapInstance.Marker({
    position: [lng, lat], title: '\u8d77\u70b9',
    icon: new AMapInstance.Icon({ image: 'https://webapi.amap.com/theme/v1.3/markers/n/start.png', size: [32, 32], imageSize: [32, 32] })
  })
  map.add(startMarker)
  map.setCenter([lng, lat])
}

function setWaypoint(idx: number, lng: number, lat: number) {
  waypoints.value[idx] = { ...waypoints.value[idx], lng, lat }
  if (waypointMarkers[idx]) map.remove(waypointMarkers[idx])
  const mc = '<div style="width:26px;height:26px;border-radius:50%;background:#FF6B6B;color:#fff;font-size:13px;font-weight:700;text-align:center;line-height:26px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">' + (idx + 1) + '</div>'
  waypointMarkers[idx] = new AMapInstance.Marker({ position: [lng, lat], title: '\u9014\u5f84\u70b9 #' + (idx + 1), content: mc, offset: new AMapInstance.Pixel(-13, -13) })
  map.add(waypointMarkers[idx])
}

function clearAllWaypointMarkers() { waypointMarkers.forEach(m => map.remove(m)); waypointMarkers = [] }

function addWaypoint() { waypoints.value.push({ lat: null, lng: null, name: '' }); pickingWaypointIdx.value = waypoints.value.length - 1 }

function toggleWaypointPick(idx: number) { if (pickingStart.value) return; if (pickingWaypointIdx.value === idx) { pickingWaypointIdx.value = null; return }; pickingWaypointIdx.value = idx }

function removeWaypoint(idx: number) { if (waypointMarkers[idx]) { map.remove(waypointMarkers[idx]); waypointMarkers.splice(idx, 1) }; waypoints.value.splice(idx, 1); if (finalDestinationIdx.value === idx) finalDestinationIdx.value = -1; else if (finalDestinationIdx.value > idx) finalDestinationIdx.value-- }

async function planRoute() {
  if (!startPoint.value || waypoints.value.length === 0 || !AMapInstance) return
  const valid = waypoints.value.filter((wp: any) => wp.lat !== null && wp.lng !== null)
  if (!valid.length) { ElMessage.warning('\u8bf7\u4e3a\u81f3\u5c11\u4e00\u4e2a\u9014\u5f84\u70b9\u8bbe\u7f6e\u5750\u6807'); return }
  planning.value = true; clearPolyline()
  try {
    const res = await navigationApi.planRoute({
      startLat: startPoint.value.lat, startLng: startPoint.value.lng,
      targets: valid.map((wp: any) => ({ lat: wp.lat, lng: wp.lng, name: wp.name || '\u9014\u5f84\u70b9' })),
      strategy: strategy.value, transports: transports.value.length ? transports.value : ['WALK'],
      finalDestinationIdx: finalDestinationIdx.value >= 0 ? finalDestinationIdx.value : undefined
    })
    routeResult.value = res.data.data; drawRoute()
  } catch (e: any) { ElMessage.error('\u8def\u5f84\u89c4\u5212\u5931\u8d25\uff1a' + (e.message || '\u672a\u77e5\u9519\u8bef')) }
  finally { planning.value = false }
}

function drawRoute() {
  if (!routeResult.value?.path || routeResult.value.path.length < 2) return; clearPolyline()
  const pts = routeResult.value.path.map((p: any) => ({ lng: p.longitude, lat: p.latitude }))
  const bldLng = 116.29221, bldLat = 40.15827, tol = 0.0001
  const indoorSet = new Set<string>()
  for (const wp of waypoints.value) { if (wp.lng && wp.lat && Math.abs(wp.lng - bldLng) < tol && Math.abs(wp.lat - bldLat) < tol) indoorSet.add(wp.lng.toFixed(5) + ',' + wp.lat.toFixed(5)) }
  let segStart = 0, isIndoor = false
  for (let i = 1; i < pts.length; i++) {
    const key = pts[i].lng.toFixed(5) + ',' + pts[i].lat.toFixed(5); const indoor = indoorSet.has(key)
    if (i > segStart && indoor !== isIndoor) {
      const path = pts.slice(segStart, i + 1).map((p: any) => [p.lng, p.lat])
      const pl = new AMapInstance.Polyline({ path, strokeColor: isIndoor ? '#E6A23C' : '#409EFF', strokeWeight: isIndoor ? 4 : 6, strokeOpacity: 0.8, strokeStyle: isIndoor ? 'dashed' : 'solid', showDir: !isIndoor })
      map.add(pl); routePolylines.push(pl); segStart = i; isIndoor = indoor
    } else if (i === 1) { isIndoor = indoor }
  }
  if (segStart < pts.length - 1) {
    const path = pts.slice(segStart).map((p: any) => [p.lng, p.lat])
    const pl = new AMapInstance.Polyline({ path, strokeColor: isIndoor ? '#E6A23C' : '#409EFF', strokeWeight: isIndoor ? 4 : 6, strokeOpacity: 0.8, strokeStyle: isIndoor ? 'dashed' : 'solid', showDir: !isIndoor })
    map.add(pl); routePolylines.push(pl)
  }
  map.setFitView(routePolylines)
}

function clearPolyline() { routePolylines.forEach(p => { if (map) map.remove(p) }); routePolylines = [] }

function resolveNodeName(nodeId: string): string {
  if (nodeId === 'start') return startPoint.value?.name || '\u8d77\u70b9'
  if (routeResult.value?.path) { const n = routeResult.value.path.find((p: any) => p.nodeId === nodeId); if (n) return n.name || '\u8282\u70b9 ' + nodeId }
  return '\u8282\u70b9 ' + nodeId
}

function formatTime(seconds: number) { if (seconds < 60) return seconds + '\u79d2'; const m = Math.floor(seconds / 60); const s = Math.round(seconds % 60); return m + '\u5206' + s + '\u79d2' }

function formatTransport(t: string): string { const m: Record<string, string> = { WALK: '\u6b65\u884c', BIKE: '\u9a91\u884c', SHUTTLE: '\u7a7f\u68ad\u5df4\u58eb' }; return m[t] || t }

async function searchPOI() { if (!poiKeyword.value.trim()) { poiResults.value = []; return }; try { const r = await poiApi.search(poiKeyword.value.trim(), 15); poiResults.value = r.data.data } catch { poiResults.value = [] } }

function selectPOI(poi: any) { poiKeyword.value = poi.name; map.setCenter([poi.lon, poi.lat]); map.setZoom(16) }

function setStartFromPOI(poi: any) { setStartPoint(poi.lon, poi.lat); if (startPoint.value) startPoint.value.name = poi.name }

function setTargetFromPOI(poi: any) { addWaypoint(); const idx = waypoints.value.length - 1; setWaypoint(idx, poi.lon, poi.lat); waypoints.value[idx].name = poi.name }

function clearRoute() { clearPolyline(); clearAllWaypointMarkers(); routeResult.value = null; if (startMarker) { map.remove(startMarker); startMarker = null }; startPoint.value = null; waypoints.value = []; pickingWaypointIdx.value = null; finalDestinationIdx.value = -1 }

async function saveItinerary() { if (!routeResult.value) return; saving.value = true; try { await itineraryApi.create({ name: '\u8def\u7ebf ' + new Date().toLocaleString('zh-CN'), routeData: JSON.stringify(routeResult.value), totalDistance: routeResult.value.totalDistance, totalTime: Math.round(routeResult.value.totalTime) }); ElMessage.success('\u884c\u7a0b\u5df2\u4fdd\u5b58') } catch { ElMessage.error('\u4fdd\u5b58\u5931\u8d25') } finally { saving.value = false } }

onMounted(() => { nextTick(initMap) })
onBeforeUnmount(() => { if (map) map.destroy() })
'''

content = content[:script_close] + missing + content[script_close:]
with open(r'D:\JC\frontend\src\views\navigation\NavigationView.vue', 'w', encoding='utf-8') as f:
    f.write(content)
print(f'Added missing functions. New length: {len(content)} chars')
