package com.journeycraft.jc.shop.dto;

import com.journeycraft.jc.common.util.CoordinateConverter;
import com.journeycraft.jc.shop.entity.Shop;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record ShopResponse(
        Long id, String name, String address, String description,
        Double latitude, Double longitude,
        Double gcjLatitude, Double gcjLongitude,
        String cuisine, Long spotId,
        BigDecimal avgRating, Integer ratingCount, Integer popularity,
        String congestionLevel, String imageUrl,
        LocalDateTime createdAt) {

    public static ShopResponse from(Shop shop) {
        double[] gcj = CoordinateConverter.wgs84ToGcj02(
                shop.getLatitude(), shop.getLongitude());
        return new ShopResponse(
                shop.getId(), shop.getName(), shop.getAddress(),
                shop.getDescription(), shop.getLatitude(), shop.getLongitude(),
                gcj[0], gcj[1],
                shop.getCuisine(), shop.getSpotId(),
                shop.getAvgRating(), shop.getRatingCount(), shop.getPopularity(),
                shop.getCongestionLevel(), shop.getImageUrl(),
                shop.getCreatedAt());
    }
}
