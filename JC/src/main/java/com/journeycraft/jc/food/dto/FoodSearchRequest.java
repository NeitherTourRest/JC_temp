package com.journeycraft.jc.food.dto;

public record FoodSearchRequest(
        String keyword,
        String cuisine,
        String restaurantName,
        String sortBy,
        Integer page,
        Integer size,
        Double lat,
        Double lng) {

    public FoodSearchRequest {
        if (page == null || page < 0) page = 0;
        if (size == null || size < 1) size = 10;
        if (sortBy == null) sortBy = "popularity";
    }
}
