package com.journeycraft.jc.spot.dto;

import com.journeycraft.jc.food.dto.FoodResponse;
import com.journeycraft.jc.spot.entity.Spot;

import java.math.BigDecimal;
import java.util.List;

public record SpotDetailResponse(
        Long id, String name, String category, String description,
        String address, Double latitude, Double longitude,
        Integer popularity, BigDecimal avgRating, Integer ratingCount,
        String imageUrl, String openingHours, BigDecimal ticketPrice,
        List<FoodResponse> recommendedFoods,
        List<SpotReviewResponse> recentReviews) {

    public static SpotDetailResponse from(Spot spot, List<FoodResponse> foods, List<SpotReviewResponse> reviews) {
        return new SpotDetailResponse(spot.getId(), spot.getName(), spot.getCategory(),
                spot.getDescription(), spot.getAddress(), spot.getLatitude(), spot.getLongitude(),
                spot.getPopularity(), spot.getAvgRating(), spot.getRatingCount(),
                spot.getImageUrl(), spot.getOpeningHours(), spot.getTicketPrice(),
                foods, reviews);
    }
}
