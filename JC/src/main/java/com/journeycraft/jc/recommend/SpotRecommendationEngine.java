package com.journeycraft.jc.recommend;

import com.journeycraft.jc.favorite.repository.FavoriteRepository;
import com.journeycraft.jc.history.repository.BrowseHistoryRepository;
import com.journeycraft.jc.navigation.algorithm.TopKSorter;
import com.journeycraft.jc.spot.entity.Spot;
import com.journeycraft.jc.spot.repository.SpotRepository;
import com.journeycraft.jc.user.repository.UserPreferenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SpotRecommendationEngine {

    private static final Set<String> RECOMMENDABLE_CATEGORIES = Set.of(
            "景点", "景区", "公园", "博物馆", "商场", "校园", "休闲", "酒店"
    );
    private static final Set<String> TOURISM_PRIORITY_CATEGORIES = Set.of(
            "景点", "景区", "公园", "博物馆", "休闲"
    );
    private static final Map<String, Set<String>> INTEREST_CATEGORY_MAPPING = Map.of(
            "自然风光", Set.of("景点", "景区", "公园", "休闲"),
            "历史古迹", Set.of("景点", "景区", "博物馆"),
            "主题乐园", Set.of("景点", "休闲"),
            "博物馆", Set.of("博物馆"),
            "校园", Set.of("校园"),
            "美食", Set.of("商场", "休闲")
    );

    private final SpotRepository spotRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    private final FavoriteRepository favoriteRepository;
    private final BrowseHistoryRepository browseHistoryRepository;

    public List<RecommendedSpot> recommendForUser(Long userId, int topK) {
        int safeTopK = Math.max(1, topK);
        List<Spot> candidates = loadCandidateSpots();
        if (candidates.isEmpty()) return List.of();

        UserSignals signals = loadUserSignals(userId, candidates);
        double maxPopularityLog = computeMaxPopularityLog(candidates);

        List<RecommendedSpot> scored = candidates.stream()
                .map(spot -> scoreForUser(spot, signals, maxPopularityLog))
                .toList();

        return selectTopKWithDiversity(scored, safeTopK);
    }

    public List<RecommendedSpot> recommendForGroup(List<Long> userIds, int topK) {
        int safeTopK = Math.max(1, topK);
        List<Spot> candidates = loadCandidateSpots();
        if (candidates.isEmpty()) return List.of();

        GroupSignals signals = loadGroupSignals(userIds, candidates);
        double maxPopularityLog = computeMaxPopularityLog(candidates);

        List<RecommendedSpot> scored = candidates.stream()
                .map(spot -> scoreForGroup(spot, signals, maxPopularityLog))
                .toList();

        return selectTopKWithDiversity(scored, safeTopK);
    }

    private List<Spot> loadCandidateSpots() {
        List<Spot> allSpots = spotRepository.findAll();
        List<Spot> candidates = allSpots.stream()
                .filter(spot -> spot.getCategory() != null && RECOMMENDABLE_CATEGORIES.contains(spot.getCategory()))
                .toList();
        return candidates.isEmpty() ? allSpots : candidates;
    }

    private double computeMaxPopularityLog(List<Spot> candidates) {
        int maxPopularity = candidates.stream().mapToInt(Spot::getPopularity).max().orElse(1);
        return Math.log1p(maxPopularity);
    }

    private UserSignals loadUserSignals(Long userId, List<Spot> candidates) {
        if (userId == null || userId <= 0) {
            return new UserSignals(Set.of(), Set.of(), new HashMap<>(), Set.of(), new HashMap<>());
        }

        Map<Long, Spot> spotById = candidates.stream()
                .collect(Collectors.toMap(Spot::getId, spot -> spot, (a, b) -> a, LinkedHashMap::new));

        Set<String> interestCategories = new HashSet<>();
        userPreferenceRepository.findByUserId(userId).ifPresent(pref -> {
            if (pref.getInterestCategories() != null) {
                for (String cat : pref.getInterestCategories().split(",")) {
                    interestCategories.addAll(expandInterestCategory(cat));
                }
            }
        });

        Set<Long> favoriteSpotIds = new HashSet<>();
        Map<String, Integer> favoriteCategoryVotes = new HashMap<>();
        var favorites = favoriteRepository.findByUserId(userId, PageRequest.of(0, 200));
        for (var favorite : favorites.getContent()) {
            if (!"SPOT".equals(favorite.getType())) continue;
            try {
                Long spotId = Long.parseLong(favorite.getTargetId());
                favoriteSpotIds.add(spotId);
                Spot spot = spotById.get(spotId);
                if (spot != null && spot.getCategory() != null) {
                    favoriteCategoryVotes.merge(spot.getCategory(), 1, Integer::sum);
                }
            } catch (NumberFormatException ignored) {
            }
        }

        Set<Long> browsedSpotIds = new HashSet<>();
        Map<String, Integer> browsedCategoryVotes = new HashMap<>();
        var browses = browseHistoryRepository.findByUserIdAndTypeOrderByCreatedAtDesc(
                userId, "SPOT", PageRequest.of(0, 200));
        for (var browse : browses.getContent()) {
            try {
                Long spotId = Long.parseLong(browse.getTargetId());
                browsedSpotIds.add(spotId);
                Spot spot = spotById.get(spotId);
                if (spot != null && spot.getCategory() != null) {
                    browsedCategoryVotes.merge(spot.getCategory(), 1, Integer::sum);
                }
            } catch (NumberFormatException ignored) {
            }
        }

        return new UserSignals(
                interestCategories,
                favoriteSpotIds,
                favoriteCategoryVotes,
                browsedSpotIds,
                browsedCategoryVotes
        );
    }

    private GroupSignals loadGroupSignals(List<Long> userIds, List<Spot> candidates) {
        if (userIds == null || userIds.isEmpty()) {
            return new GroupSignals(Set.of(), Set.of(), new HashMap<>(), 0);
        }

        Map<Long, Spot> spotById = candidates.stream()
                .collect(Collectors.toMap(Spot::getId, spot -> spot, (a, b) -> a, LinkedHashMap::new));

        Map<String, Integer> categoryVoteCount = new HashMap<>();
        Set<String> unionCategories = new HashSet<>();
        Map<String, Integer> favoriteCategoryVotes = new HashMap<>();
        int usersWithPreference = 0;

        for (Long userId : userIds) {
            if (userId == null || userId <= 0) continue;

            Set<String> currentUserCategories = new HashSet<>();
            userPreferenceRepository.findByUserId(userId).ifPresent(pref -> {
                if (pref.getInterestCategories() != null) {
                    for (String cat : pref.getInterestCategories().split(",")) {
                        currentUserCategories.addAll(expandInterestCategory(cat));
                    }
                }
            });

            if (!currentUserCategories.isEmpty()) {
                usersWithPreference++;
                unionCategories.addAll(currentUserCategories);
                for (String category : currentUserCategories) {
                    categoryVoteCount.merge(category, 1, Integer::sum);
                }
            }

            var favorites = favoriteRepository.findByUserId(userId, PageRequest.of(0, 100));
            for (var favorite : favorites.getContent()) {
                if (!"SPOT".equals(favorite.getType())) continue;
                try {
                    Long spotId = Long.parseLong(favorite.getTargetId());
                    Spot spot = spotById.get(spotId);
                    if (spot != null && spot.getCategory() != null) {
                        favoriteCategoryVotes.merge(spot.getCategory(), 1, Integer::sum);
                    }
                } catch (NumberFormatException ignored) {
                }
            }
        }

        int totalUsersWithPreference = usersWithPreference;
        Set<String> intersectionCategories = categoryVoteCount.entrySet().stream()
                .filter(entry -> totalUsersWithPreference > 0 && entry.getValue() == totalUsersWithPreference)
                .map(Map.Entry::getKey)
                .collect(Collectors.toSet());

        return new GroupSignals(unionCategories, intersectionCategories, favoriteCategoryVotes, totalUsersWithPreference);
    }

    private RecommendedSpot scoreForUser(Spot spot, UserSignals signals, double maxPopularityLog) {
        double popularityNorm = normalizePopularity(spot.getPopularity(), maxPopularityLog);
        double ratingNorm = normalizeRating(spot.getAvgRating(), spot.getRatingCount());
        double interestMatch = signals.interestCategories().contains(spot.getCategory()) ? 1.0 : 0.0;
        double favoriteSpotMatch = signals.favoriteSpotIds().contains(spot.getId()) ? 1.0 : 0.0;
        double favoriteCategoryAffinity = normalizedVote(signals.favoriteCategoryVotes(), spot.getCategory());
        double browseCategoryAffinity = normalizedVote(signals.browsedCategoryVotes(), spot.getCategory());
        double browsedSpotMatch = signals.browsedSpotIds().contains(spot.getId()) ? 1.0 : 0.0;
        double tourismPriority = TOURISM_PRIORITY_CATEGORIES.contains(spot.getCategory()) ? 1.0 : 0.0;

        double score = popularityNorm * 0.22
                + ratingNorm * 0.18
                + interestMatch * 0.32
                + favoriteCategoryAffinity * 0.10
                + browseCategoryAffinity * 0.08
                + tourismPriority * 0.05
                + favoriteSpotMatch * 0.03
                + browsedSpotMatch * 0.02;

        String reason = buildUserReason(
                interestMatch,
                favoriteCategoryAffinity,
                browseCategoryAffinity,
                ratingNorm,
                popularityNorm
        );

        return new RecommendedSpot(spot, score, reason);
    }

    private RecommendedSpot scoreForGroup(Spot spot, GroupSignals signals, double maxPopularityLog) {
        double popularityNorm = normalizePopularity(spot.getPopularity(), maxPopularityLog);
        double ratingNorm = normalizeRating(spot.getAvgRating(), spot.getRatingCount());
        double intersectionMatch = signals.intersectionCategories().contains(spot.getCategory()) ? 1.0 : 0.0;
        double unionMatch = signals.unionCategories().contains(spot.getCategory()) ? 1.0 : 0.0;
        double favoriteCategoryAffinity = normalizedVote(signals.favoriteCategoryVotes(), spot.getCategory());
        double tourismPriority = TOURISM_PRIORITY_CATEGORIES.contains(spot.getCategory()) ? 1.0 : 0.0;

        double score = popularityNorm * 0.35
                + ratingNorm * 0.22
                + intersectionMatch * 0.18
                + unionMatch * 0.10
                + favoriteCategoryAffinity * 0.10
                + tourismPriority * 0.05;

        String reason = buildGroupReason(
                intersectionMatch,
                unionMatch,
                favoriteCategoryAffinity,
                ratingNorm,
                popularityNorm
        );

        return new RecommendedSpot(spot, score, reason);
    }

    private double normalizePopularity(int popularity, double maxPopularityLog) {
        if (maxPopularityLog <= 0) return 0.0;
        return Math.log1p(Math.max(0, popularity)) / maxPopularityLog;
    }

    private double normalizeRating(BigDecimal avgRating, Integer ratingCount) {
        double rating = avgRating != null ? avgRating.doubleValue() / 5.0 : 0.0;
        double confidence = Math.min(1.0, (ratingCount != null ? ratingCount : 0) / 50.0);
        return rating * (0.4 + confidence * 0.6);
    }

    private double normalizedVote(Map<String, Integer> votes, String category) {
        if (category == null || votes.isEmpty()) return 0.0;
        int maxVote = votes.values().stream().mapToInt(Integer::intValue).max().orElse(0);
        if (maxVote <= 0) return 0.0;
        return votes.getOrDefault(category, 0) / (double) maxVote;
    }

    private Set<String> expandInterestCategory(String rawCategory) {
        String trimmed = rawCategory != null ? rawCategory.trim() : "";
        if (trimmed.isEmpty()) return Set.of();

        Set<String> mapped = INTEREST_CATEGORY_MAPPING.get(trimmed);
        if (mapped != null && !mapped.isEmpty()) {
            return mapped;
        }

        return Set.of(trimmed);
    }

    private List<RecommendedSpot> selectTopKWithDiversity(List<RecommendedSpot> scored, int topK) {
        if (scored.isEmpty()) return List.of();

        int poolSize = Math.min(scored.size(), Math.max(topK * 3, topK));
        List<RecommendedSpot> topPool = TopKSorter.topK(
                scored,
                poolSize,
                Comparator.comparingDouble(RecommendedSpot::score)
        );

        return rerankForDiversity(topPool, topK);
    }

    private List<RecommendedSpot> rerankForDiversity(List<RecommendedSpot> topPool, int topK) {
        if (topPool.isEmpty()) return List.of();

        int perCategoryCap = Math.max(2, Math.min(3, topK / 2));
        Map<String, Integer> categoryCounts = new HashMap<>();
        List<RecommendedSpot> result = new ArrayList<>();

        for (RecommendedSpot candidate : topPool) {
            if (result.size() >= topK) break;
            String category = candidate.spot().getCategory() != null ? candidate.spot().getCategory() : "";
            int used = categoryCounts.getOrDefault(category, 0);
            if (used >= perCategoryCap) continue;
            result.add(candidate);
            categoryCounts.put(category, used + 1);
        }

        if (result.size() < topK) {
            Set<Long> selectedIds = result.stream().map(item -> item.spot().getId()).collect(Collectors.toSet());
            for (RecommendedSpot candidate : topPool) {
                if (result.size() >= topK) break;
                if (selectedIds.add(candidate.spot().getId())) {
                    result.add(candidate);
                }
            }
        }

        return result;
    }

    private String buildUserReason(
            double interestMatch,
            double favoriteCategoryAffinity,
            double browseCategoryAffinity,
            double ratingNorm,
            double popularityNorm
    ) {
        List<String> reasons = new ArrayList<>();
        if (interestMatch > 0) reasons.add("匹配你的兴趣");
        if (favoriteCategoryAffinity >= 0.5) reasons.add("接近你的收藏偏好");
        if (browseCategoryAffinity >= 0.5) reasons.add("接近你的浏览偏好");
        if (ratingNorm >= 0.7) reasons.add("评分较高");
        if (popularityNorm >= 0.8) reasons.add("近期热门");
        if (reasons.isEmpty()) reasons.add("综合热度推荐");
        return String.join(" · ", reasons.stream().limit(2).toList());
    }

    private String buildGroupReason(
            double intersectionMatch,
            double unionMatch,
            double favoriteCategoryAffinity,
            double ratingNorm,
            double popularityNorm
    ) {
        List<String> reasons = new ArrayList<>();
        if (intersectionMatch > 0) reasons.add("符合多人共同偏好");
        else if (unionMatch > 0) reasons.add("符合组内成员偏好");
        if (favoriteCategoryAffinity >= 0.5) reasons.add("与组内收藏偏好接近");
        if (ratingNorm >= 0.7) reasons.add("评分较高");
        if (popularityNorm >= 0.8) reasons.add("近期热门");
        if (reasons.isEmpty()) reasons.add("综合热度推荐");
        return String.join(" · ", reasons.stream().limit(2).toList());
    }

    public record RecommendedSpot(Spot spot, double score, String reason) {}

    private record UserSignals(
            Set<String> interestCategories,
            Set<Long> favoriteSpotIds,
            Map<String, Integer> favoriteCategoryVotes,
            Set<Long> browsedSpotIds,
            Map<String, Integer> browsedCategoryVotes
    ) {}

    private record GroupSignals(
            Set<String> unionCategories,
            Set<String> intersectionCategories,
            Map<String, Integer> favoriteCategoryVotes,
            int usersWithPreference
    ) {}
}
