package com.journeycraft.jc.food.dto;

import com.journeycraft.jc.food.entity.Food;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record FoodResponse(
        Long id, String name, String cuisine, String restaurantName,
        Long spotId, String description, String priceRange,
        Double latitude, Double longitude,
        Integer popularity, BigDecimal avgRating, Integer ratingCount,
        String imageUrl, LocalDateTime createdAt) {

    public static FoodResponse from(Food food) {
        return new FoodResponse(food.getId(), food.getName(), food.getCuisine(),
                food.getRestaurantName(), food.getSpotId(), food.getDescription(),
                food.getPriceRange(), food.getLatitude(), food.getLongitude(),
                food.getPopularity(), food.getAvgRating(), food.getRatingCount(),
                food.getImageUrl(), food.getCreatedAt());
    }
}
