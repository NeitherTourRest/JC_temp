package com.journeycraft.jc.spot.dto;

import com.journeycraft.jc.common.util.CoordinateConverter;
import com.journeycraft.jc.spot.entity.Spot;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record SpotResponse(
        Long id, String name, String category, String description,
        String address, Double latitude, Double longitude,
        Double gcjLatitude, Double gcjLongitude,
        Integer popularity, BigDecimal avgRating, Integer ratingCount,
        String imageUrl, String openingHours, BigDecimal ticketPrice,
        LocalDateTime createdAt) {

    public static SpotResponse from(Spot spot) {
        double[] gcj = CoordinateConverter.wgs84ToGcj02(
                spot.getLatitude(), spot.getLongitude());
        return new SpotResponse(spot.getId(), spot.getName(), spot.getCategory(),
                spot.getDescription(), spot.getAddress(), spot.getLatitude(), spot.getLongitude(),
                gcj[0], gcj[1],
                spot.getPopularity(), spot.getAvgRating(), spot.getRatingCount(),
                spot.getImageUrl(), spot.getOpeningHours(), spot.getTicketPrice(),
                spot.getCreatedAt());
    }
}
