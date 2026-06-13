package com.journeycraft.jc.collaboration;

import com.journeycraft.jc.common.exception.BadRequestException;
import com.journeycraft.jc.recommend.SpotRecommendationEngine;
import com.journeycraft.jc.spot.dto.SpotResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Collaborative filtering service for multi-user trip planning.
 * Merges preferences from multiple users to produce a compromise recommendation.
 */
@Service
@RequiredArgsConstructor
public class CollaborationService {

    private final SpotRecommendationEngine spotRecommendationEngine;

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
        return spotRecommendationEngine.recommendForGroup(userIds, topK).stream()
                .map(recommendedSpot -> SpotResponse.from(recommendedSpot.spot()))
                .toList();
    }
}
