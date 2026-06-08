package com.journeycraft.jc.collaboration;

import com.journeycraft.jc.common.exception.BadRequestException;
import com.journeycraft.jc.spot.dto.SpotResponse;
import com.journeycraft.jc.spot.entity.Spot;
import com.journeycraft.jc.spot.repository.SpotRepository;
import com.journeycraft.jc.user.entity.UserPreference;
import com.journeycraft.jc.user.repository.UserPreferenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Collaborative filtering service for multi-user trip planning.
 * Merges preferences from multiple users to produce a compromise recommendation.
 */
@Service
@RequiredArgsConstructor
public class CollaborationService {

    private final UserPreferenceRepository userPreferenceRepository;
    private final SpotRepository spotRepository;

    /**
     * Collaborative recommendation for a group of users.
     * Algorithm:
     * 1. Collect all users' interest categories and cuisine preferences
     * 2. Categories shared by ALL users get highest weight (intersection)
     * 3. Categories liked by ANY user also considered (union) at lower weight
     * 4. Score spots based on category match + popularity
     * 5. Return top-K results
     */
    public List<SpotResponse> collaborativeRecommend(List<Long> userIds, int topK) {
        if (userIds == null || userIds.isEmpty()) {
            throw new BadRequestException("At least one user ID is required");
        }

        // Collect all preferences
        List<UserPreference> allPrefs = new ArrayList<>();
        for (Long uid : userIds) {
            userPreferenceRepository.findByUserId(uid).ifPresent(allPrefs::add);
        }

        if (allPrefs.isEmpty()) {
            // Fallback: return popular spots
            return spotRepository.findTopKByPopularity(
                    org.springframework.data.domain.PageRequest.of(0, topK))
                    .stream().map(SpotResponse::from).toList();
        }

        // Parse interest categories from all users
        Set<String> allCategories = new HashSet<>();
        Map<String, Integer> categoryVoteCount = new HashMap<>();
        for (UserPreference pref : allPrefs) {
            if (pref.getInterestCategories() != null) {
                String[] cats = pref.getInterestCategories().split(",");
                for (String cat : cats) {
                    String trimmed = cat.trim();
                    if (!trimmed.isEmpty()) {
                        allCategories.add(trimmed);
                        categoryVoteCount.merge(trimmed, 1, Integer::sum);
                    }
                }
            }
        }

        // Categories everyone agrees on (intersection) get bonus weight
        int totalUsers = allPrefs.size();
        Set<String> intersectionCats = categoryVoteCount.entrySet().stream()
                .filter(e -> e.getValue() == totalUsers)
                .map(Map.Entry::getKey)
                .collect(Collectors.toSet());

        // Score all spots
        List<Spot> allSpots = spotRepository.findAll();
        List<ScoredSpot> scored = new ArrayList<>();

        for (Spot spot : allSpots) {
            double score = spot.getPopularity() * 0.01; // base: popularity weight
            String cat = spot.getCategory();

            if (cat != null) {
                // Intersection match: everyone likes this category → high bonus
                if (intersectionCats.contains(cat)) {
                    score += 100;
                }
                // Union match: someone likes this category → moderate bonus
                else if (allCategories.contains(cat)) {
                    score += 30;
                }
            }
            scored.add(new ScoredSpot(spot, score));
        }

        // Sort by score descending, take top K
        scored.sort((a, b) -> Double.compare(b.score, a.score));
        return scored.stream()
                .limit(topK)
                .map(s -> SpotResponse.from(s.spot))
                .toList();
    }

    private record ScoredSpot(Spot spot, double score) {}
}
