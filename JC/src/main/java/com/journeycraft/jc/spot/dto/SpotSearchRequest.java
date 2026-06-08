package com.journeycraft.jc.spot.dto;

public record SpotSearchRequest(
        String keyword,
        String category,
        String sortBy,    // "popularity" or "rating"
        Integer page,
        Integer size) {

    public SpotSearchRequest {
        if (page == null || page < 0) page = 0;
        if (size == null || size < 1) size = 10;
        if (sortBy == null) sortBy = "popularity";
    }
}
