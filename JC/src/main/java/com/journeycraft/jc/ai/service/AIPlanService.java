package com.journeycraft.jc.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.journeycraft.jc.food.entity.Food;
import com.journeycraft.jc.food.repository.FoodRepository;
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
 * Harness工程:
 * - 结构化prompt模板（日期、预算、兴趣、出行方式）
 * - 输出格式约束（JSON结构要求）
 * - 响应解析与fallback
 * - 参数校验
 */
@Service
public class AIPlanService {

    private static final Logger log = LoggerFactory.getLogger(AIPlanService.class);
    private final DeepSeekClient deepSeek;
    private final SpotRepository spotRepository;
    private final FoodRepository foodRepository;
    private final ObjectMapper mapper = new ObjectMapper();

    public AIPlanService(DeepSeekClient deepSeek, SpotRepository spotRepository, FoodRepository foodRepository) {
        this.deepSeek = deepSeek;
        this.spotRepository = spotRepository;
        this.foodRepository = foodRepository;
    }

    private static final String SYSTEM_PROMPT = """
你是一个北京昌平区旅行规划专家。根据用户提供的偏好信息，生成一份详细的旅行计划。

输出格式要求：必须使用以下JSON格式（不要包含markdown代码块标记），确保是合法的JSON：

{
  "title": "行程标题",
  "days": [
    {
      "day": 1,
      "date": "第1天",
      "theme": "当天主题",
      "schedule": [
        {"time": "09:00", "activity": "活动名称", "location": "地点", "duration": "预计时长", "notes": "备注"}
      ]
    }
  ],
  "tips": ["建议1", "建议2"],
  "estimatedCost": "预估总花费"
}

要求：
1. 每日行程要合理，考虑景点之间的距离和交通时间
2. 景点必须是北京昌平区真实存在的景点
3. 考虑用户的兴趣偏好（自然/历史/美食/购物等）
4. 考虑用户的出行方式（步行/骑行/驾车）
5. 每项活动标注建议时间
6. 给出实用的出行建议和注意事项
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
        List<ActivityItem> schedule
    ) {}

    public record ActivityItem(
        String time, String activity, String location,
        String duration, String notes,
        Long matchedSpotId, Long matchedFoodId,
        Double matchedLat, Double matchedLng,
        String matchedName, String matchedType  // "spot" | "food" | "none"
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
        // 构建用户偏好描述
        StringBuilder userPrompt = new StringBuilder();
        userPrompt.append("请为我规划一个").append(request.days()).append("天的昌平区旅行计划。");
        userPrompt.append("\n我的兴趣偏好：").append(request.interests() != null ? request.interests() : "无特别偏好");
        userPrompt.append("\n预算水平：").append(request.budget() != null ? request.budget() : "中等");
        userPrompt.append("\n出行方式：").append(request.transport() != null ? request.transport() : "未指定");
        if (request.additionalInfo() != null && !request.additionalInfo().isBlank()) {
            userPrompt.append("\n额外要求：").append(request.additionalInfo());
        }

        String reply = deepSeek.chat(List.of(Map.of("role", "user", "content", userPrompt.toString())), SYSTEM_PROMPT);

        // 尝试解析JSON响应
        try {
            String json = reply.trim();
            // 移除可能的markdown代码块标记
            json = json.replaceAll("```json\\s*", "").replaceAll("```\\s*", "");
            var root = mapper.readTree(json);

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
                                null, null, null, null, null, null
                            );
                            activities.add(matchActivityItem(raw));
                        }
                    }
                    days.add(new DaySchedule(
                        dayNode.get("day").asInt(),
                        getStr(dayNode, "date"),
                        getStr(dayNode, "theme"),
                        activities
                    ));
                }
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
            log.warn("Failed to parse AI plan response as JSON: {}", e.getMessage());
            // Fallback: return raw text
            return new PlanResult("行程规划", List.of(), List.of(), "", reply);
        }
    }

    private ActivityItem matchActivityItem(ActivityItem item) {
        String keyword = item.activity();
        if (keyword == null || keyword.isBlank()) {
            return new ActivityItem(item.time(), item.activity(), item.location(),
                item.duration(), item.notes(),
                null, null, null, null, null, "none");
        }

        // 1. Try spots by activity name (fuzzy LIKE %keyword%)
        var spotPage = spotRepository.searchByKeyword(keyword, PageRequest.of(0, 3));
        if (spotPage.hasContent()) {
            Spot s = spotPage.getContent().get(0);
            return new ActivityItem(item.time(), item.activity(), item.location(),
                item.duration(), item.notes(),
                s.getId(), null, s.getLatitude(), s.getLongitude(),
                s.getName(), "spot");
        }

        // 2. Try foods by activity name
        var foodPage = foodRepository.searchByKeyword(keyword, PageRequest.of(0, 3));
        if (foodPage.hasContent()) {
            Food f = foodPage.getContent().get(0);
            return new ActivityItem(item.time(), item.activity(), item.location(),
                item.duration(), item.notes(),
                null, f.getId(), f.getLatitude(), f.getLongitude(),
                f.getName(), "food");
        }

        // 3. Try spots by location as fallback
        String loc = item.location();
        if (loc != null && !loc.isBlank() && !loc.equals(keyword)) {
            spotPage = spotRepository.searchByKeyword(loc, PageRequest.of(0, 3));
            if (spotPage.hasContent()) {
                Spot s = spotPage.getContent().get(0);
                return new ActivityItem(item.time(), item.activity(), item.location(),
                    item.duration(), item.notes(),
                    s.getId(), null, s.getLatitude(), s.getLongitude(),
                    s.getName(), "spot");
            }

            // 4. Try foods by location
            foodPage = foodRepository.searchByKeyword(loc, PageRequest.of(0, 3));
            if (foodPage.hasContent()) {
                Food f = foodPage.getContent().get(0);
                return new ActivityItem(item.time(), item.activity(), item.location(),
                    item.duration(), item.notes(),
                    null, f.getId(), f.getLatitude(), f.getLongitude(),
                    f.getName(), "food");
            }
        }

        // No match found
        return new ActivityItem(item.time(), item.activity(), item.location(),
            item.duration(), item.notes(),
            null, null, null, null, null, "none");
    }

    private String getStr(com.fasterxml.jackson.databind.JsonNode node, String field) {
        return node.has(field) && !node.get(field).isNull() ? node.get(field).asText() : "";
    }
}
