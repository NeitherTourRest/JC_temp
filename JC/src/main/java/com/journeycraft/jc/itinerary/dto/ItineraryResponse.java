package com.journeycraft.jc.itinerary.dto;

import com.journeycraft.jc.itinerary.entity.Itinerary;
import java.time.LocalDateTime;
import java.util.List;

public record ItineraryResponse(
        Long id, Long userId, String name, String routeData,
        String spotIds, Double totalDistance, Integer totalTime,
        LocalDateTime createdAt,
        Integer version,
        String myRole,
        List<CollaboratorResponse> collaborators) {
    public static ItineraryResponse from(Itinerary it) {
        return new ItineraryResponse(it.getId(), it.getUserId(), it.getName(),
                it.getRouteData(), it.getSpotIds(), it.getTotalDistance(),
                it.getTotalTime(), it.getCreatedAt(),
                it.getVersion(), null, List.of());
    }

    public static ItineraryResponse from(Itinerary it, String myRole, List<CollaboratorResponse> collaborators) {
        return new ItineraryResponse(it.getId(), it.getUserId(), it.getName(),
                it.getRouteData(), it.getSpotIds(), it.getTotalDistance(),
                it.getTotalTime(), it.getCreatedAt(),
                it.getVersion(), myRole, collaborators);
    }
}
