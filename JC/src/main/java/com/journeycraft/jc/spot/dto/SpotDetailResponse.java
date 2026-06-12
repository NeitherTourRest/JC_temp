package com.journeycraft.jc.spot.dto;

import com.journeycraft.jc.common.util.CoordinateConverter;
import com.journeycraft.jc.facility.dto.FacilityResponse;
import com.journeycraft.jc.food.dto.FoodResponse;
import com.journeycraft.jc.spot.entity.Spot;

import java.math.BigDecimal;
import java.util.List;

public record SpotDetailResponse(
        Long id, String name, String category, String description,
        String address, Double latitude, Double longitude,
        Double gcjLatitude, Double gcjLongitude,
        Integer popularity, BigDecimal avgRating, Integer ratingCount,
        String imageUrl, String openingHours, BigDecimal ticketPrice,
        List<FoodResponse> recommendedFoods,
        List<SpotReviewResponse> recentReviews,
        List<FacilityResponse> facilities,
        String congestionLevel) {

    public static SpotDetailResponse from(Spot spot, List<FoodResponse> foods, List<SpotReviewResponse> reviews,
                                           List<FacilityResponse> facilities) {
        double[] gcj = CoordinateConverter.wgs84ToGcj02(
                spot.getLatitude(), spot.getLongitude());
        return new SpotDetailResponse(spot.getId(), spot.getName(), spot.getCategory(),
                spot.getDescription(), spot.getAddress(), spot.getLatitude(), spot.getLongitude(),
                gcj[0], gcj[1],
                spot.getPopularity(), spot.getAvgRating(), spot.getRatingCount(),
                spot.getImageUrl(), spot.getOpeningHours(), spot.getTicketPrice(),
                foods, reviews, facilities,
                spot.getCongestionLevel() != null ? spot.getCongestionLevel() : "EMPTY");
    }
}
