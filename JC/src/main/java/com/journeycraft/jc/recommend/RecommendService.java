package com.journeycraft.jc.recommend;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 综合推荐引擎 - 基于用户兴趣+行为+热度的个性化推荐
 * 
 * 算法:
 * 1. 兴趣匹配: 从user_preferences读取兴趣类别，匹配景点分类
 * 2. 行为加权: 用户浏览/收藏过的同类景点获得加分
 * 3. 热度兜底: 无行为数据时按popularity排序
 * 4. 混合输出: 景点+美食+日记混合推荐
 */
@Service
public class RecommendService {

    private final SpotRecommendationEngine spotRecommendationEngine;
    private final com.journeycraft.jc.spot.repository.SpotRepository spotRepo;
    private final com.journeycraft.jc.food.repository.FoodRepository foodRepo;
    private final com.journeycraft.jc.diary.repository.DiaryRepository diaryRepo;

    public RecommendService(
            SpotRecommendationEngine spotRecommendationEngine,
            com.journeycraft.jc.spot.repository.SpotRepository spotRepo,
            com.journeycraft.jc.food.repository.FoodRepository foodRepo,
            com.journeycraft.jc.diary.repository.DiaryRepository diaryRepo) {
        this.spotRecommendationEngine = spotRecommendationEngine;
        this.spotRepo = spotRepo; this.foodRepo = foodRepo;
        this.diaryRepo = diaryRepo;
    }

    public record RecommendResult(
            List<Map<String, Object>> spots,
            List<Map<String, Object>> foods,
            List<Map<String, Object>> diaries
    ) {}

    /**
     * 综合推荐：根据用户兴趣+行为+热度，返回景点/美食/日记
     */
    @Transactional(readOnly = true)
    public RecommendResult recommend(Long userId, int topK) {
        int safeTopK = Math.max(1, topK);

        List<Map<String, Object>> spotResults = spotRecommendationEngine.recommendForUser(userId, safeTopK).stream()
                .map(this::toSpotMap)
                .collect(Collectors.toList());

        // 4. 美食推荐：按热度
        List<Map<String, Object>> foodResults = foodRepo.findAll(
                org.springframework.data.domain.PageRequest.of(0, safeTopK,
                org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "popularity")))
                .stream().map(f -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", f.getId()); m.put("name", f.getName());
                    m.put("cuisine", f.getCuisine()); m.put("restaurantName", f.getRestaurantName());
                    m.put("avgRating", f.getAvgRating()); m.put("popularity", f.getPopularity());
                    if (f.getSpotId() != null) spotRepo.findById(f.getSpotId()).ifPresent(s -> m.put("spotName", s.getName()));
                    return m;
                }).collect(Collectors.toList());

        // 5. 日记推荐：公开日记按热度
        List<Map<String, Object>> diaryResults = diaryRepo.findByIsPublicTrue(
                org.springframework.data.domain.PageRequest.of(0, safeTopK,
                org.springframework.data.domain.Sort.by(
                        org.springframework.data.domain.Sort.Direction.DESC, "popularity")))
                .stream().map(d -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", d.getId()); m.put("title", d.getTitle());
                    m.put("destination", d.getDestination()); m.put("avgRating", d.getAvgRating());
                    m.put("popularity", d.getPopularity());
                    return m;
                }).collect(Collectors.toList());

        return new RecommendResult(spotResults, foodResults, diaryResults);
    }

    private Map<String, Object> toSpotMap(SpotRecommendationEngine.RecommendedSpot recommendedSpot) {
        var spot = recommendedSpot.spot();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", spot.getId());
        m.put("name", spot.getName());
        m.put("category", spot.getCategory());
        m.put("description", spot.getDescription());
        m.put("address", spot.getAddress());
        m.put("latitude", spot.getLatitude());
        m.put("longitude", spot.getLongitude());
        m.put("popularity", spot.getPopularity());
        m.put("avgRating", spot.getAvgRating());
        m.put("ratingCount", spot.getRatingCount());
        m.put("imageUrl", spot.getImageUrl());
        m.put("openingHours", spot.getOpeningHours());
        m.put("ticketPrice", spot.getTicketPrice());
        m.put("reason", recommendedSpot.reason());
        return m;
    }
}
