package com.journeycraft.jc.navigation.dto;

import java.util.List;

public record RouteResponse(
        List<Waypoint> path,
        double totalDistance,
        double totalTime,
        String strategy,
        List<String> visitOrder
) {
    public record Waypoint(
            String nodeId,
            double latitude,
            double longitude,
            String name,
            boolean isTarget) {
    }
}
