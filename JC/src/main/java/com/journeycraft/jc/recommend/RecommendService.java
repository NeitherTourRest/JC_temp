package com.journeycraft.jc.recommend;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
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

    private final com.journeycraft.jc.spot.repository.SpotRepository spotRepo;
    private final com.journeycraft.jc.food.repository.FoodRepository foodRepo;
    private final com.journeycraft.jc.diary.repository.DiaryRepository diaryRepo;
    private final com.journeycraft.jc.user.repository.UserPreferenceRepository prefRepo;
    private final com.journeycraft.jc.favorite.repository.FavoriteRepository favRepo;

    public RecommendService(
            com.journeycraft.jc.spot.repository.SpotRepository spotRepo,
            com.journeycraft.jc.food.repository.FoodRepository foodRepo,
            com.journeycraft.jc.diary.repository.DiaryRepository diaryRepo,
            com.journeycraft.jc.user.repository.UserPreferenceRepository prefRepo,
            com.journeycraft.jc.favorite.repository.FavoriteRepository favRepo) {
        this.spotRepo = spotRepo; this.foodRepo = foodRepo;
        this.diaryRepo = diaryRepo; this.prefRepo = prefRepo; this.favRepo = favRepo;
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
        // 1. 读取用户兴趣偏好
        Set<String> interestCats = new HashSet<>();
        if (userId != null) {
            prefRepo.findByUserId(userId).ifPresent(pref -> {
                if (pref.getInterestCategories() != null) {
                    Collections.addAll(interestCats, pref.getInterestCategories().split(","));
                }
            });
        }

        // 2. 读取用户收藏过的内容 (行为信号)
        Set<Long> favoritedSpotIds = new HashSet<>();
        if (userId != null) {
            var favs = favRepo.findByUserId(userId,
                    org.springframework.data.domain.PageRequest.of(0, 100));
            for (var f : favs.getContent()) {
                if ("SPOT".equals(f.getType())) favoritedSpotIds.add(Long.parseLong(f.getTargetId()));
            }
        }

        Set<String> finalInterestCats = interestCats;
        Set<Long> finalFavIds = favoritedSpotIds;

        // 3. 景点推荐：兴趣匹配+收藏加分+热度兜底
        List<Map<String, Object>> spotResults = spotRepo.findAll().stream()
                .map(s -> {
                    double score = s.getPopularity() * 0.01;
                    if (finalInterestCats.contains(s.getCategory())) score += 50;
                    if (finalFavIds.contains(s.getId())) score += 100;
                    return scoreEntry("spot", s.getId(), s.getName(), s.getCategory(), s.getAvgRating(), score);
                })
                .sorted((a,b) -> Double.compare((Double)b.get("_score"), (Double)a.get("_score")))
                .limit(topK)
                .peek(m -> m.remove("_score"))
                .collect(Collectors.toList());

        // 4. 美食推荐：按热度
        List<Map<String, Object>> foodResults = foodRepo.findAll(
                org.springframework.data.domain.PageRequest.of(0, topK,
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
                org.springframework.data.domain.PageRequest.of(0, topK,
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

    private Map<String, Object> scoreEntry(String type, Long id, String name, String category,
                                             java.math.BigDecimal rating, double score) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id); m.put("name", name); m.put("category", category);
        m.put("avgRating", rating); m.put("_score", score);
        return m;
    }
}
