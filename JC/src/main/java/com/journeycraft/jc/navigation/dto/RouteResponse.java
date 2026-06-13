package com.journeycraft.jc.navigation.dto;

import java.util.List;

public record RouteResponse(
        List<Waypoint> path,
        double totalDistance,
        double totalTime,
        String strategy,
        List<String> visitOrder,
        List<RouteSegment> segments
) {
    public record Waypoint(
            String nodeId,
            double latitude,
            double longitude,
            String name,
            boolean isTarget) {
    }

    /** A segment of the route with transport mode and road info. */
    public record RouteSegment(
            String fromNodeId, String toNodeId,
            double distance, double time,
            String roadName, String roadType,
            String transport
    ) {}
}
