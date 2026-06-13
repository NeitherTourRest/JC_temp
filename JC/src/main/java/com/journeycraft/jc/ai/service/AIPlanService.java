package com.journeycraft.jc.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.journeycraft.jc.common.util.AmapWebServiceClient;
import com.journeycraft.jc.common.util.CoordinateTransform;
import com.journeycraft.jc.food.entity.Food;
import com.journeycraft.jc.food.repository.FoodRepository;
import com.journeycraft.jc.navigation.algorithm.DijkstraAlgorithm;
import com.journeycraft.jc.navigation.graph.Graph;
import com.journeycraft.jc.shop.entity.Shop;
import com.journeycraft.jc.shop.repository.ShopRepository;
import com.journeycraft.jc.spot.entity.Spot;
import com.journeycraft.jc.spot.repository.SpotRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * AI行程规划服务 - 根据用户偏好生成旅行计划
 * 
 * 流程:
 * 1. DeepSeek AI 生成文本行程
 * 2. matchActivityItem() 四层 DB LIKE + Amap 地理编码兜底匹配
 * 3. computeDayRoutes() 同一天活动间 Dijkstra 步行路径计算
 */
@Service
public class AIPlanService {

    private static final Logger log = LoggerFactory.getLogger(AIPlanService.class);
    private final DeepSeekClient deepSeek;
    private final SpotRepository spotRepository;
    private final FoodRepository foodRepository;
    private final ShopRepository shopRepository;
    private final AmapWebServiceClient amap;
    private final Graph navigationGraph;
    private final ObjectMapper mapper = new ObjectMapper();

    public AIPlanService(DeepSeekClient deepSeek, SpotRepository spotRepository,
                         FoodRepository foodRepository, ShopRepository shopRepository,
                         AmapWebServiceClient amap,
                         Graph navigationGraph) {
        this.deepSeek = deepSeek;
        this.spotRepository = spotRepository;
        this.foodRepository = foodRepository;
        this.shopRepository = shopRepository;
        this.amap = amap;
        this.navigationGraph = navigationGraph;
    }

    private static final String SYSTEM_PROMPT = """
    你是一个北京昌平区旅行规划专家。根据用户提供的偏好信息，生成一份详细的旅行计划。
    
    输出格式要求：必须使用以下JSON格式（不要包含markdown代码块标记），确保是合法的JSON：
    
    {
      "title": "昌平经典一日游",
      "days": [
        {
          "day": 1,
          "date": "第1天",
          "theme": "历史文化探索",
          "schedule": [
            {"time": "09:00", "activity": "参观明十三陵", "location": "明十三陵", "duration": "3小时", "notes": "世界文化遗产，建议租讲解器"},
            {"time": "12:30", "activity": "品尝康陵春饼宴", "location": "康陵", "duration": "1.5小时", "notes": "当地特色美食"}          ]
        }
      ],
      "tips": ["带好水和防晒", "提前预约门票"],
      "estimatedCost": "300-500元"
    }
    
    ⚠️ 关键要求（必须严格遵守）：
    1. activity 字段用简短的活动动词+地点名，例如"参观明十三陵""去居庸关长城"
    2. location 字段必须是**昌平区内**有真实坐标的知名地点名，**绝对禁止写"昌平区"作为地点**
    3. 昌平区地理范围：北纬40.0-40.3度，东经116.0-116.5度。**所有地点必须在这个范围内**
    4. 常用真实地点参考：明十三陵、居庸关长城、蟒山国家森林公园、十三陵水库、昌平新城滨河森林公园、白浮泉公园、乐多港万达广场、八达岭奥特莱斯、温都水城、小汤山温泉、兴寿草莓园、军都山滑雪场、静之湖、银山塔林、虎峪自然风景区、大岭沟猕猴桃谷、双龙山森林公园、延寿寺、和平寺、北京后花园(白虎涧)、阳坊、康陵、长陵、定陵、昭陵、神路、七孔桥花海
    5. **绝对不要推荐昌平区以外的地点**（如故宫、天安门、颐和园、长城不在昌平区的段落等）
    6. 每项活动标注建议时间，地点之间要留足交通时间（驾车10-30分钟，步行30-60分钟）
    7. 每日安排3-6个活动，不要太赶
    8. 考虑用户的兴趣偏好（自然/历史/美食/购物/滑雪/温泉等）和出行方式
    """;

    public record PlanRequest(
        int days,
        String interests,      // 兴趣偏好，如"自然风光,历史古迹"
        String budget,         // 预算，如"低/中/高"
        String transport,      // 出行方式
        String additionalInfo  // 额外要求
    ) {}

    public record DaySchedule(
        int day, String date, String theme,
        List<ActivityItem> schedule,
        Double routeTotalDistance,   // 全天路线总距离(米), null if no routes computed
        Double routeTotalTime        // 全天路线总时间(秒), null if no routes computed
    ) {}

    public record ActivityItem(
        String time, String activity, String location,
        String duration, String notes,
        Long matchedSpotId, Long matchedFoodId,
        Double matchedLat, Double matchedLng,
        String matchedName, String matchedType,  // "spot" | "food" | "amap_geocode" | "amap_poi" | "none"
        Double routePrevDistance,    // 上一活动到此距离(米), null if first activity
        Double routePrevTime         // 上一活动到此时间(秒), null if first activity
    ) {}

    public record PlanResult(
        String title,
        List<DaySchedule> days,
        List<String> tips,
        String estimatedCost,
        String rawResponse  // fallback: 如果解析失败则返回原始文本
    ) {}

    /**
     * 生成旅行规划
     */
    public PlanResult generatePlan(PlanRequest request) {
        StringBuilder userPrompt = new StringBuilder();
        userPrompt.append("请为我规划一个").append(request.days()).append("天的昌平区旅行计划。");
        userPrompt.append("\n我的兴趣偏好：").append(request.interests() != null ? request.interests() : "无特别偏好");
        userPrompt.append("\n预算：").append(request.budget() != null && !request.budget().isBlank() ? request.budget() + "元" : "不限");
        userPrompt.append("\n出行方式：").append(request.transport() != null ? request.transport() : "未指定");
        if (request.additionalInfo() != null && !request.additionalInfo().isBlank()) {
            userPrompt.append("\n额外要求：").append(request.additionalInfo());
        }

        String reply = deepSeek.chat(List.of(Map.of("role", "user", "content", userPrompt.toString())), SYSTEM_PROMPT);

        try {
            String json = reply.trim();
            json = json.replaceAll("```json\\s*", "").replaceAll("```\\s*", "");
            var root = mapper.readTree(json);

            // Request-level Amap cache to avoid duplicate API calls
            Map<String, Optional<double[]>> geocodeCache = new HashMap<>();
            Map<String, Optional<List<AmapWebServiceClient.AmapPoi>>> poiCache = new HashMap<>();

            List<DaySchedule> days = new ArrayList<>();
            if (root.has("days")) {
                for (var dayNode : root.get("days")) {
                    List<ActivityItem> activities = new ArrayList<>();
                    if (dayNode.has("schedule")) {
                        for (var act : dayNode.get("schedule")) {
                            ActivityItem raw = new ActivityItem(
                                getStr(act, "time"), getStr(act, "activity"),
                                getStr(act, "location"), getStr(act, "duration"),
                                getStr(act, "notes"),
                                null, null, null, null, null, null,
                                null, null
                            );
                            activities.add(matchActivityItem(raw, geocodeCache, poiCache));
                        }
                    }
                    days.add(new DaySchedule(
                        dayNode.get("day").asInt(),
                        getStr(dayNode, "date"),
                        getStr(dayNode, "theme"),
                        activities,
                        null, null
                    ));
                }
            }

            // Post-processing: compute walking routes between consecutive activities
            try {
                computeDayRoutes(days);
            } catch (Exception e) {
                log.warn("Route computation failed (non-fatal): {}", e.getMessage());
            }

            List<String> tips = new ArrayList<>();
            if (root.has("tips")) {
                root.get("tips").forEach(t -> tips.add(t.asText()));
            }

            return new PlanResult(
                getStr(root, "title"),
                days, tips,
                getStr(root, "estimatedCost"),
                null
            );
        } catch (Exception e) {
            log.warn("Failed to generate plan: {}: '{}'", e.getClass().getSimpleName(), e.getMessage());
            if (log.isDebugEnabled()) {
                log.debug("Stack trace:", e);
            }
            return new PlanResult("行程规划", List.of(), List.of(), "", reply);
        }
    }

    /**
     * 多层级活动匹配:
     * 1. spots 表 LIKE activity (提取关键词后)
     * 2. spots 表 LIKE location
     * 3. shops 表 LIKE searchTerm (337家真实餐馆)
     * 4. shops 表 LIKE location
     * 5. foods 表 LIKE activity
     * 6. foods 表 LIKE location
     * 7. Amap geocode
     * 8. Amap POI search
     * 各级匹配结果经 request 级缓存去重。
     */
    private ActivityItem matchActivityItem(ActivityItem item,
                                           Map<String, Optional<double[]>> geocodeCache,
                                           Map<String, Optional<List<AmapWebServiceClient.AmapPoi>>> poiCache) {
        String keyword = item.activity();
        String loc = item.location();
        String searchTerm = keyword;
        
        String extracted = extractPlaceName(keyword);
        if (extracted != null) searchTerm = extracted;
        
        if (searchTerm == null || searchTerm.isBlank()) {
            return withFields(item, null, null, null, null, null, "none", null, null);
        }

        // 1. Try spots by extracted activity name
        var spotPage = safePage(spotRepository.searchByKeyword(searchTerm, PageRequest.of(0, 3)));
        if (spotPage.hasContent()) {
            Spot s = spotPage.getContent().get(0);
            double[] gcj = CoordinateTransform.wgs84ToGcj02(s.getLatitude(), s.getLongitude());
            return withFields(item, s.getId(), null, gcj[0], gcj[1], s.getName(), "spot", null, null);
        }

        // 2. Try spots by location
        if (loc != null && !loc.isBlank() && !loc.equals(searchTerm)) {
            spotPage = safePage(spotRepository.searchByKeyword(loc, PageRequest.of(0, 3)));
            if (spotPage.hasContent()) {
                Spot s = spotPage.getContent().get(0);
                double[] gcj = CoordinateTransform.wgs84ToGcj02(s.getLatitude(), s.getLongitude());
                return withFields(item, s.getId(), null, gcj[0], gcj[1], s.getName(), "spot", null, null);
            }
        }

        // 3. Try shops (337 real restaurants from Amap)
        var shopPage = safePage(shopRepository.searchByKeyword(searchTerm, PageRequest.of(0, 3)));
        if (shopPage.hasContent()) {
            Shop sh = shopPage.getContent().get(0);
            double[] gcj = CoordinateTransform.wgs84ToGcj02(sh.getLatitude(), sh.getLongitude());
            return withFields(item, null, null, gcj[0], gcj[1], sh.getName(), "food", null, null);
        }
        if (loc != null && !loc.isBlank() && !loc.equals(searchTerm)) {
            shopPage = safePage(shopRepository.searchByKeyword(loc, PageRequest.of(0, 3)));
            if (shopPage.hasContent()) {
                Shop sh = shopPage.getContent().get(0);
                double[] gcj = CoordinateTransform.wgs84ToGcj02(sh.getLatitude(), sh.getLongitude());
                return withFields(item, null, null, gcj[0], gcj[1], sh.getName(), "food", null, null);
            }
        }

        // 4. Try foods by extracted activity name
        var foodPage = safePage(foodRepository.searchByKeyword(searchTerm, PageRequest.of(0, 3)));
        if (foodPage.hasContent()) {
            Food f = foodPage.getContent().get(0);
            double[] gcj = CoordinateTransform.wgs84ToGcj02(f.getLatitude(), f.getLongitude());
            return withFields(item, null, f.getId(), gcj[0], gcj[1], f.getName(), "food", null, null);
        }

        // 5. Try foods by location
        if (loc != null && !loc.isBlank() && !loc.equals(searchTerm)) {
            foodPage = safePage(foodRepository.searchByKeyword(loc, PageRequest.of(0, 3)));
            if (foodPage.hasContent()) {
                Food f = foodPage.getContent().get(0);
                double[] gcj = CoordinateTransform.wgs84ToGcj02(f.getLatitude(), f.getLongitude());
                return withFields(item, null, f.getId(), gcj[0], gcj[1], f.getName(), "food", null, null);
            }
        }

        // 6-7. Amap fallback
        return matchViaAmap(item, searchTerm, loc, geocodeCache, poiCache);
    }

    /**
     * Extract a clean place name from an AI-generated activity description.
     * Handles patterns like: "参观明十三陵" "去康陵村吃春饼宴" "逛八达岭奥特莱斯"
     */
    private String extractPlaceName(String activity) {
        if (activity == null || activity.isBlank()) return null;
        String cleaned = activity
                .replaceAll("^(参观|前往|游览|去|到|在|去往|出发去|开车去|步行去|骑行去|逛|游玩|玩|爬|登|上|进|进入|来|来到|走进|出发|开始)\\s*", "")
                .replaceAll("^(品尝|吃|喝|试试|尝|买|采购|购物|散步|跑步|锻炼|拍照|摄影|写生|画画|学习|上课|参加|体验)\\s*", "")
                .replaceAll("[的景区内景点处附近周边地区公园广场街道里面外面一带左右附近之中之间]+$", "")
                .replaceAll("(附近|周边|一带|里面|外面|旁边|对面|路口|尽头|起点|终点)$", "")
                .replaceAll("(吃|喝|品尝|参观|游览|游玩|逛)$", "")
                .trim();
        if (cleaned.length() >= 2) return cleaned;
        return activity.length() >= 2 ? activity : null;
    }

    /**
     * Amap geocode/POI fallback with caching.
     * Uses 昌平 as city for more relevant local results.
     */
    private ActivityItem matchViaAmap(ActivityItem item, String searchTerm, String loc,
                                       Map<String, Optional<double[]>> geocodeCache,
                                       Map<String, Optional<List<AmapWebServiceClient.AmapPoi>>> poiCache) {
        if (!amap.isAvailable()) {
            return withFields(item, null, null, null, null, null, "none", null, null);
        }

        // Collect all possible search terms (de-duplicated)
        Set<String> targets = new LinkedHashSet<>();
        if (loc != null && !loc.isBlank()) targets.add(loc.trim());
        if (searchTerm != null && !searchTerm.isBlank()) targets.add(searchTerm.trim());
        // Also try the original activity text if different from both
        String orig = item.activity();
        if (orig != null && !orig.isBlank()) {
            String t = orig.trim();
            if (!targets.contains(t)) targets.add(t);
        }

        // 1. Try geocode with each target
        for (String target : targets) {
            String cacheKey = "geo:" + target.toLowerCase();
            Optional<double[]> cached = geocodeCache.get(cacheKey);
            if (cached == null) {
                var result = amap.geocode(target, "昌平");
                cached = result != null ? Optional.of(new double[]{result.lat(), result.lng()}) : Optional.empty();
                geocodeCache.put(cacheKey, cached);
            }
            if (cached.isPresent()) {
                return withFields(item, null, null, cached.get()[0], cached.get()[1], target, "amap_geocode", null, null);
            }
        }

        // 2. Try POI search with each target (in 昌平 for local relevance)
        for (String target : targets) {
            String cacheKey = "poi:" + target.toLowerCase();
            Optional<List<AmapWebServiceClient.AmapPoi>> cached = poiCache.get(cacheKey);
            if (cached == null) {
                List<AmapWebServiceClient.AmapPoi> pois = amap.searchPoi(target, "昌平", 5, 1);
                cached = Optional.ofNullable((pois != null && !pois.isEmpty()) ? pois : null);
                poiCache.put(cacheKey, cached);
            }
            if (cached.isPresent() && !cached.get().isEmpty()) {
                var poi = cached.get().get(0);
                return withFields(item, null, null, poi.lat(), poi.lng(), poi.name(), "amap_poi", null, null);
            }
        }

        // 3. Final fallback: try POI search with just the main keyword in 北京 (broader scope)
        for (String target : targets) {
            if (target.length() < 2) continue;
            String broadKey = "poi_broad:" + target.toLowerCase();
            Optional<List<AmapWebServiceClient.AmapPoi>> cached = poiCache.get(broadKey);
            if (cached == null) {
                List<AmapWebServiceClient.AmapPoi> pois = amap.searchPoi(target, "北京", 5, 1);
                cached = Optional.ofNullable((pois != null && !pois.isEmpty()) ? pois : null);
                poiCache.put(broadKey, cached);
            }
            if (cached.isPresent() && !cached.get().isEmpty()) {
                var poi = cached.get().get(0);
                return withFields(item, null, null, poi.lat(), poi.lng(), poi.name(), "amap_poi", null, null);
            }
        }

        return withFields(item, null, null, null, null, null, "none", null, null);
    }

    /**
     * Compute walking routes between consecutive activities within each day.
     * Bridges over unmatched activities (no coordinates) by linking the nearest
     * matched predecessor to the next matched successor.
     */
    private void computeDayRoutes(List<DaySchedule> days) {
        for (int d = 0; d < days.size(); d++) {
            var day = days.get(d);
            var schedule = day.schedule();
            if (schedule.size() < 2) continue;

            double dayTotalDist = 0;
            double dayTotalTime = 0;
            List<ActivityItem> updated = new ArrayList<>();
            int lastMatchedIdx = -1;

            for (int i = 0; i < schedule.size(); i++) {
                ActivityItem curr = schedule.get(i);
                Double prevDist = null;
                Double prevTime = null;

                // If current has coordinates and there's a previous matched activity, compute route
                if (curr.matchedLat() != null && lastMatchedIdx >= 0) {
                    ActivityItem prev = updated.get(lastMatchedIdx);
                    if (prev.matchedLat() != null) {
                        var fromNode = navigationGraph.findNearestNode(prev.matchedLat(), prev.matchedLng());
                        var toNode = navigationGraph.findNearestNode(curr.matchedLat(), curr.matchedLng());

                        if (fromNode != null && toNode != null) {
                            if (navigationGraph.isSameComponent(fromNode.getNodeId(), toNode.getNodeId())) {
                                var pathResult = DijkstraAlgorithm.findShortestPath(
                                    navigationGraph, fromNode.getNodeId(), toNode.getNodeId(),
                                    "DISTANCE", 5.0);
                                if (pathResult.isReachable()) {
                                    prevDist = pathResult.totalDistance();
                                    prevTime = pathResult.totalTime();
                                }
                            }
                            if (prevDist == null) {
                                prevDist = Graph.haversineDistance(
                                    prev.matchedLat(), prev.matchedLng(),
                                    curr.matchedLat(), curr.matchedLng());
                                prevTime = prevDist / 1.4;
                            }
                            dayTotalDist += prevDist;
                            dayTotalTime += prevTime;
                        }
                    }
                }

                updated.add(new ActivityItem(
                    curr.time(), curr.activity(), curr.location(),
                    curr.duration(), curr.notes(),
                    curr.matchedSpotId(), curr.matchedFoodId(),
                    curr.matchedLat(), curr.matchedLng(),
                    curr.matchedName(), curr.matchedType(),
                    prevDist, prevTime
                ));

                if (curr.matchedLat() != null) {
                    lastMatchedIdx = i;
                }
            }

            days.set(d, new DaySchedule(
                day.day(), day.date(), day.theme(),
                updated,
                dayTotalDist > 0 ? dayTotalDist : null,
                dayTotalTime > 0 ? dayTotalTime : null
            ));
        }
    }

    /** Create ActivityItem with specific matched fields, validating coordinates are in Changping. */
    private ActivityItem withFields(ActivityItem base, Long spotId, Long foodId,
                                     Double lat, Double lng, String name, String type,
                                     Double prevDist, Double prevTime) {
        // Reject coordinates outside Changping bounds
        if (lat != null && lng != null && !inChangping(lat, lng)) {
            return new ActivityItem(
                base.time(), base.activity(), base.location(),
                base.duration(), base.notes(),
                null, null, null, null, null, "none",
                null, null
            );
        }
        return new ActivityItem(
            base.time(), base.activity(), base.location(),
            base.duration(), base.notes(),
            spotId, foodId, lat, lng, name, type,
            null, null
        );
    }

    private <T> org.springframework.data.domain.Page<T> safePage(org.springframework.data.domain.Page<T> page) {
        if (page != null) return page;
        return new org.springframework.data.domain.PageImpl<>(java.util.List.of());
    }

    /** Changping district approximate bounding box */
    private static final double CP_MIN_LAT = 40.0, CP_MAX_LAT = 40.32;
    private static final double CP_MIN_LNG = 115.9, CP_MAX_LNG = 116.5;

    /** Check if coordinates are within Changping district bounds */
    private boolean inChangping(double lat, double lng) {
        return lat >= CP_MIN_LAT && lat <= CP_MAX_LAT
            && lng >= CP_MIN_LNG && lng <= CP_MAX_LNG;
    }

    private String getStr(com.fasterxml.jackson.databind.JsonNode node, String field) {
        return node.has(field) && !node.get(field).isNull() ? node.get(field).asText() : "";
    }
}
