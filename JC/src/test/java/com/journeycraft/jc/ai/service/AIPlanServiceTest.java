package com.journeycraft.jc.ai.service;

import com.journeycraft.jc.food.entity.Food;
import com.journeycraft.jc.food.repository.FoodRepository;
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
@DisplayName("AIPlanService — AI plan generation with spot/food matching")
class AIPlanServiceTest {

    @Mock private DeepSeekClient deepSeek;
    @Mock private SpotRepository spotRepository;
    @Mock private FoodRepository foodRepository;

    private AIPlanService service;

    private Spot mingTomb, greatWall;
    private Food changpingDuck;

    @BeforeEach
    void setUp() {
        service = new AIPlanService(deepSeek, spotRepository, foodRepository);

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
        assertEquals(40.25, act1.matchedLat(), 0.001);
        assertEquals(116.22, act1.matchedLng(), 0.001);

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
        // Spot search for "昌平烤鸭" returns empty
        when(spotRepository.searchByKeyword(eq("昌平烤鸭"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        // Food search matches
        when(foodRepository.searchByKeyword(eq("昌平烤鸭"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(changpingDuck)));
        // Second activity matches spot
        when(spotRepository.searchByKeyword(eq("明十三陵"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(mingTomb)));

        var result = service.generatePlan(new AIPlanService.PlanRequest(2, "美食,历史", "中", "步行", ""));

        // Day 1: food match
        AIPlanService.ActivityItem act1 = result.days().get(0).schedule().get(0);
        assertEquals("food", act1.matchedType());
        assertNull(act1.matchedSpotId());
        assertEquals(1L, act1.matchedFoodId());
        assertEquals("昌平烤鸭", act1.matchedName());
        assertEquals(40.22, act1.matchedLat(), 0.001);
        assertEquals(116.24, act1.matchedLng(), 0.001);

        // Day 2: spot match
        AIPlanService.ActivityItem act2 = result.days().get(1).schedule().get(0);
        assertEquals("spot", act2.matchedType());
        assertEquals(1L, act2.matchedSpotId());
    }

    @Test
    @DisplayName("should fall back to location-based spot match when activity name not found")
    void shouldMatchSpotByLocationFallback() {
        String json = buildJsonPlan("神秘地点", "居庸关长城", "火星基地", "明十三陵");
        when(deepSeek.chat(anyList(), anyString())).thenReturn(json);
        // First activity: spot search for "神秘地点" empty, food search also empty
        when(spotRepository.searchByKeyword(eq("神秘地点"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(foodRepository.searchByKeyword(eq("神秘地点"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        // Location-based spot match for "居庸关长城"
        when(spotRepository.searchByKeyword(eq("居庸关长城"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(greatWall)));

        // Second activity: activity search empty
        when(spotRepository.searchByKeyword(eq("火星基地"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(foodRepository.searchByKeyword(eq("火星基地"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        // Location-based match
        when(spotRepository.searchByKeyword(eq("明十三陵"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(mingTomb)));

        var result = service.generatePlan(new AIPlanService.PlanRequest(2, "探索", "中", "步行", ""));

        // Day 1: matched via location → spot
        AIPlanService.ActivityItem act1 = result.days().get(0).schedule().get(0);
        assertEquals("spot", act1.matchedType());
        assertEquals(2L, act1.matchedSpotId());
        assertEquals("居庸关长城", act1.matchedName());

        // Day 2: matched via location → spot
        AIPlanService.ActivityItem act2 = result.days().get(1).schedule().get(0);
        assertEquals("spot", act2.matchedType());
        assertEquals(1L, act2.matchedSpotId());
        assertEquals("明十三陵", act2.matchedName());
    }

    @Test
    @DisplayName("should return none when no match found")
    void shouldReturnNoneWhenNoMatch() {
        String json = buildJsonPlan("未知景点", "未知区域", "火星基地", "月球表面");
        when(deepSeek.chat(anyList(), anyString())).thenReturn(json);
        // All searches return empty
        when(spotRepository.searchByKeyword(anyString(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(foodRepository.searchByKeyword(anyString(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        var result = service.generatePlan(new AIPlanService.PlanRequest(2, "未知", "低", "步行", ""));

        for (var day : result.days()) {
            for (var act : day.schedule()) {
                assertEquals("none", act.matchedType());
                assertNull(act.matchedSpotId());
                assertNull(act.matchedFoodId());
                assertNull(act.matchedLat());
                assertNull(act.matchedLng());
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
}
