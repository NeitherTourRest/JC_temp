package com.journeycraft.jc.navigation.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record RouteRequest(
        @NotNull Double startLat,
        @NotNull Double startLng,
        @NotEmpty List<TargetPoint> targets,
        String strategy,          // "DISTANCE" or "TIME"
        List<String> transports,  // ["WALK"], ["BIKE"], ["SHUTTLE"], or combination
        Integer finalDestinationIdx // index in targets[] that is the final stop; null means return to start
) {
    public RouteRequest {
        if (strategy == null || strategy.isBlank()) strategy = "DISTANCE";
        if (transports == null || transports.isEmpty()) transports = List.of("WALK");
    }

    public record TargetPoint(
            @NotNull Double lat,
            @NotNull Double lng,
            String name) {
    }
}
