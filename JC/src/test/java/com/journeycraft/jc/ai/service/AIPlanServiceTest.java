package com.journeycraft.jc.ai.service;

import com.journeycraft.jc.common.util.AmapWebServiceClient;
import com.journeycraft.jc.food.entity.Food;
import com.journeycraft.jc.food.repository.FoodRepository;
import com.journeycraft.jc.navigation.graph.Graph;
import com.journeycraft.jc.spot.entity.Spot;
import com.journeycraft.jc.spot.repository.SpotRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("AIPlanService — AI plan generation with spot/food/Amap matching")
class AIPlanServiceTest {

    @Mock private DeepSeekClient deepSeek;
    @Mock private SpotRepository spotRepository;
    @Mock private FoodRepository foodRepository;
    @Mock private com.journeycraft.jc.shop.repository.ShopRepository shopRepository;
    @Mock private AmapWebServiceClient amap;
    @Mock private Graph navigationGraph;

    private AIPlanService service;

    private Spot mingTomb, greatWall;
    private Food changpingDuck;

    @BeforeEach
    void setUp() {
        service = new AIPlanService(deepSeek, spotRepository, foodRepository, shopRepository, amap, navigationGraph);

        mingTomb = Spot.builder().id(1L).name("明十三陵").category("scenic")
                .latitude(40.25).longitude(116.22).popularity(95)
                .avgRating(BigDecimal.valueOf(4.5)).build();
        greatWall = Spot.builder().id(2L).name("居庸关长城").category("scenic")
                .latitude(40.30).longitude(116.10).popularity(98)
                .avgRating(BigDecimal.valueOf(4.7)).build();
        changpingDuck = Food.builder().id(1L).name("昌平烤鸭").cuisine("本地")
                .restaurantName("昌平烤鸭店").latitude(40.22).longitude(116.24)
                .popularity(90).avgRating(BigDecimal.valueOf(4.3)).build();
    }

    private String buildJsonPlan(String day1Activity, String day1Loc,
                                  String day2Activity, String day2Loc) {
        return """
            {
              "title": "昌平 2 日游",
              "days": [
                {
                  "day": 1,
                  "date": "第1天",
                  "theme": "文化探索",
                  "schedule": [
                    {"time": "09:00", "activity": "%s", "location": "%s", "duration": "3小时", "notes": ""}
                  ]
                },
                {
                  "day": 2,
                  "date": "第2天",
                  "theme": "自然风光",
                  "schedule": [
                    {"time": "08:00", "activity": "%s", "location": "%s", "duration": "4小时", "notes": ""}
                  ]
                }
              ],
              "tips": ["带好水和防晒"],
              "estimatedCost": "300-500元"
            }
            """.formatted(day1Activity, day1Loc, day2Activity, day2Loc);
    }

    @Test
    @DisplayName("should match spot by activity name")
    void shouldMatchSpotByActivityName() {
        String json = buildJsonPlan("明十三陵", "昌平区", "居庸关长城", "昌平区");
        when(deepSeek.chat(anyList(), anyString())).thenReturn(json);
        when(spotRepository.searchByKeyword(eq("明十三陵"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(mingTomb)));
        when(spotRepository.searchByKeyword(eq("居庸关长城"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(greatWall)));

        var result = service.generatePlan(new AIPlanService.PlanRequest(2, "历史,自然", "中", "步行", ""));

        assertEquals("昌平 2 日游", result.title());
        assertEquals(2, result.days().size());

        // Day 1: spot match
        AIPlanService.ActivityItem act1 = result.days().get(0).schedule().get(0);
        assertEquals("spot", act1.matchedType());
        assertEquals(1L, act1.matchedSpotId());
        assertNull(act1.matchedFoodId());
        assertEquals("明十三陵", act1.matchedName());

        // Day 2: spot match
        AIPlanService.ActivityItem act2 = result.days().get(1).schedule().get(0);
        assertEquals("spot", act2.matchedType());
        assertEquals(2L, act2.matchedSpotId());
        assertEquals("居庸关长城", act2.matchedName());
    }

    @Test
    @DisplayName("should match food by activity name when spot not found")
    void shouldMatchFoodByActivityName() {
        String json = buildJsonPlan("昌平烤鸭", "永安路", "明十三陵", "昌平区");
        when(deepSeek.chat(anyList(), anyString())).thenReturn(json);
        when(spotRepository.searchByKeyword(eq("昌平烤鸭"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(foodRepository.searchByKeyword(eq("昌平烤鸭"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(changpingDuck)));
        when(spotRepository.searchByKeyword(eq("明十三陵"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(mingTomb)));

        var result = service.generatePlan(new AIPlanService.PlanRequest(2, "美食,历史", "中", "步行", ""));

        AIPlanService.ActivityItem act1 = result.days().get(0).schedule().get(0);
        assertEquals("food", act1.matchedType());
        assertNull(act1.matchedSpotId());
        assertEquals(1L, act1.matchedFoodId());
        assertEquals("昌平烤鸭", act1.matchedName());

        AIPlanService.ActivityItem act2 = result.days().get(1).schedule().get(0);
        assertEquals("spot", act2.matchedType());
        assertEquals(1L, act2.matchedSpotId());
    }

    @Test
    @DisplayName("should fall back to location-based spot match when activity name not found")
    void shouldMatchSpotByLocationFallback() {
        String json = buildJsonPlan("神秘地点", "居庸关长城", "火星基地", "明十三陵");
        when(deepSeek.chat(anyList(), anyString())).thenReturn(json);
        when(spotRepository.searchByKeyword(eq("神秘地点"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(foodRepository.searchByKeyword(eq("神秘地点"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(spotRepository.searchByKeyword(eq("居庸关长城"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(greatWall)));

        when(spotRepository.searchByKeyword(eq("火星基地"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(foodRepository.searchByKeyword(eq("火星基地"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(spotRepository.searchByKeyword(eq("明十三陵"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(mingTomb)));

        var result = service.generatePlan(new AIPlanService.PlanRequest(2, "探索", "中", "步行", ""));

        AIPlanService.ActivityItem act1 = result.days().get(0).schedule().get(0);
        assertEquals("spot", act1.matchedType());
        assertEquals(2L, act1.matchedSpotId());
        assertEquals("居庸关长城", act1.matchedName());

        AIPlanService.ActivityItem act2 = result.days().get(1).schedule().get(0);
        assertEquals("spot", act2.matchedType());
        assertEquals(1L, act2.matchedSpotId());
        assertEquals("明十三陵", act2.matchedName());
    }

    @Test
    @DisplayName("should return Amap geocode match when DB and location all miss")
    void shouldMatchViaAmapGeocode() {
        String json = buildJsonPlan("康陵春饼宴", "昌平", "明十三陵", "昌平区");
        when(deepSeek.chat(anyList(), anyString())).thenReturn(json);

        // DB layers all miss for first activity
        when(spotRepository.searchByKeyword(eq("康陵春饼宴"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(foodRepository.searchByKeyword(eq("康陵春饼宴"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        // Location-based fallback also misses
        when(spotRepository.searchByKeyword(eq("昌平"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(foodRepository.searchByKeyword(eq("昌平"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        // Amap geocode succeeds (tries "康陵春饼宴" with city "昌平")
        when(amap.isAvailable()).thenReturn(true);
        when(amap.geocode(eq("康陵春饼宴"), eq("昌平")))
                .thenReturn(new AmapWebServiceClient.AmapGeocode(40.21, 116.23, "昌平区康陵村", "兴趣点"));

        // Second activity matches spot
        when(spotRepository.searchByKeyword(eq("明十三陵"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(mingTomb)));

        var result = service.generatePlan(new AIPlanService.PlanRequest(2, "美食", "中", "步行", ""));

        AIPlanService.ActivityItem act1 = result.days().get(0).schedule().get(0);
        assertEquals("amap_geocode", act1.matchedType());
        assertEquals(40.21, act1.matchedLat(), 0.001);
        assertEquals(116.23, act1.matchedLng(), 0.001);
        assertEquals("康陵春饼宴", act1.matchedName());
    }

    @Test
    @DisplayName("should return Amap POI match when geocode also misses")
    void shouldMatchViaAmapPoi() {
        String json = buildJsonPlan("老北京炸酱面", "昌平", "明十三陵", "昌平区");
        when(deepSeek.chat(anyList(), anyString())).thenReturn(json);

        // DB layers all miss
        when(spotRepository.searchByKeyword(eq("老北京炸酱面"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(foodRepository.searchByKeyword(eq("老北京炸酱面"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        // Location-based fallback also misses
        when(spotRepository.searchByKeyword(eq("昌平"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(foodRepository.searchByKeyword(eq("昌平"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        // Amap geocode misses with both "老北京炸酱面" and "昌平"
        when(amap.isAvailable()).thenReturn(true);
        when(amap.geocode(anyString(), eq("昌平")))
                .thenReturn(null);

        // Amap POI search succeeds (tries "老北京炸酱面" with city "昌平")
        var poi = new AmapWebServiceClient.AmapPoi("老北京炸酱面馆", "昌平区", 40.20, 116.22, "餐饮服务;中餐", "050100", "", "");
        when(amap.searchPoi(anyString(), eq("昌平"), eq(5), eq(1)))
                .thenReturn(List.of());  // first: no results in 昌平
        when(amap.searchPoi(anyString(), eq("北京"), eq(5), eq(1)))
                .thenReturn(List.of(poi));  // broader search in 北京 succeeds

        when(spotRepository.searchByKeyword(eq("明十三陵"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(mingTomb)));

        var result = service.generatePlan(new AIPlanService.PlanRequest(2, "美食", "中", "步行", ""));

        AIPlanService.ActivityItem act1 = result.days().get(0).schedule().get(0);
        assertEquals("amap_poi", act1.matchedType());
        assertEquals(40.20, act1.matchedLat(), 0.001);
        assertEquals(116.22, act1.matchedLng(), 0.001);
    }

    @Test
    @DisplayName("should return none when no match found")
    void shouldReturnNoneWhenNoMatch() {
        String json = buildJsonPlan("未知景点", "未知区域", "火星基地", "月球表面");
        when(deepSeek.chat(anyList(), anyString())).thenReturn(json);
        when(spotRepository.searchByKeyword(anyString(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(foodRepository.searchByKeyword(anyString(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        // Amap unavailable, so geocode/POI not reached

        var result = service.generatePlan(new AIPlanService.PlanRequest(2, "未知", "低", "步行", ""));

        for (var day : result.days()) {
            for (var act : day.schedule()) {
                assertEquals("none", act.matchedType());
                assertNull(act.matchedSpotId());
                assertNull(act.matchedFoodId());
                assertNull(act.matchedLat());
                assertNull(act.matchedLng());
                assertNull(act.routePrevDistance());
                assertNull(act.routePrevTime());
            }
        }
    }

    @Test
    @DisplayName("should handle empty activity name gracefully")
    void shouldHandleEmptyActivity() {
        String json = """
            {
              "title": "空计划",
              "days": [
                {
                  "day": 1, "date": "第1天", "theme": "自由活动",
                  "schedule": [
                    {"time": "09:00", "activity": "", "location": "", "duration": "全天", "notes": "自由安排"}
                  ]
                }
              ],
              "tips": [],
              "estimatedCost": ""
            }
            """;
        when(deepSeek.chat(anyList(), anyString())).thenReturn(json);

        var result = service.generatePlan(new AIPlanService.PlanRequest(1, "", "低", "步行", ""));

        assertEquals("空计划", result.title());
        assertEquals(1, result.days().size());
        assertEquals(1, result.days().get(0).schedule().size());
        assertEquals("none", result.days().get(0).schedule().get(0).matchedType());
    }

    @Test
    @DisplayName("should still handle invalid JSON fallback")
    void shouldHandleInvalidJsonFallback() {
        when(deepSeek.chat(anyList(), anyString())).thenReturn("这不是 JSON");

        var result = service.generatePlan(new AIPlanService.PlanRequest(1, "历史", "低", "步行", ""));

        assertEquals("行程规划", result.title());
        assertTrue(result.days().isEmpty());
        assertEquals("这不是 JSON", result.rawResponse());
    }

    @Test
    @DisplayName("should skip Amap when unavailable")
    void shouldSkipAmapWhenUnavailable() {
        String json = buildJsonPlan("神秘餐厅", "昌平", "明十三陵", "昌平区");
        when(deepSeek.chat(anyList(), anyString())).thenReturn(json);
        when(spotRepository.searchByKeyword(eq("神秘餐厅"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(foodRepository.searchByKeyword(eq("神秘餐厅"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        // Location-based fallback for "昌平" also empty
        when(spotRepository.searchByKeyword(eq("昌平"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(foodRepository.searchByKeyword(eq("昌平"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(amap.isAvailable()).thenReturn(false);
        when(spotRepository.searchByKeyword(eq("明十三陵"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(mingTomb)));

        var result = service.generatePlan(new AIPlanService.PlanRequest(2, "美食", "低", "步行", ""));

        assertEquals("none", result.days().get(0).schedule().get(0).matchedType());
    }

    @Test
    @DisplayName("should compute route distances between consecutive activities")
    void shouldComputeRouteDistances() {
        String json = """
            {
              "title": "一日游",
              "days": [
                {
                  "day": 1, "date": "第1天", "theme": "探索",
                  "schedule": [
                    {"time": "09:00", "activity": "明十三陵", "location": "昌平", "duration": "3小时", "notes": ""},
                    {"time": "13:00", "activity": "居庸关长城", "location": "昌平", "duration": "3小时", "notes": ""}
                  ]
                }
              ],
              "tips": [],
              "estimatedCost": ""
            }
            """;
        when(deepSeek.chat(anyList(), anyString())).thenReturn(json);

        // Both activities match spots
        when(spotRepository.searchByKeyword(eq("明十三陵"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(mingTomb)));
        when(spotRepository.searchByKeyword(eq("居庸关长城"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(greatWall)));

        // Mock findNearestNode
        var node1 = new com.journeycraft.jc.navigation.graph.GraphNode("n1", 40.25, 116.22);
        var node2 = new com.journeycraft.jc.navigation.graph.GraphNode("n2", 40.30, 116.10);
        when(navigationGraph.findNearestNode(anyDouble(), anyDouble()))
                .thenReturn(node1).thenReturn(node2);
        when(navigationGraph.isSameComponent(anyString(), anyString())).thenReturn(true);

        var result = service.generatePlan(new AIPlanService.PlanRequest(1, "历史", "中", "步行", ""));

        // Day should have route totals
        assertNotNull(result.days().get(0).routeTotalDistance());
        assertNotNull(result.days().get(0).routeTotalTime());

        // First activity has null route fields, second has computed ones
        assertNull(result.days().get(0).schedule().get(0).routePrevDistance());
        assertNull(result.days().get(0).schedule().get(0).routePrevTime());
        assertNotNull(result.days().get(0).schedule().get(1).routePrevDistance());
        assertNotNull(result.days().get(0).schedule().get(1).routePrevTime());
    }
}

