package com.journeycraft.jc.spot.dto;

import com.journeycraft.jc.spot.entity.SpotReview;

import java.time.LocalDateTime;

public record SpotReviewResponse(
        Long id, Long userId, Integer rating, String content, LocalDateTime createdAt) {

    public static SpotReviewResponse from(SpotReview review) {
        return new SpotReviewResponse(review.getId(), review.getUserId(),
                review.getRating(), review.getContent(), review.getCreatedAt());
    }
}
