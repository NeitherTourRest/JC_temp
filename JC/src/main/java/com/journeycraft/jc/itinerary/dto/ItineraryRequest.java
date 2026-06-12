package com.journeycraft.jc.itinerary.dto;

import jakarta.validation.constraints.NotBlank;

public record ItineraryRequest(
        @NotBlank String name,
        String routeData,
        String spotIds,
        Double totalDistance,
        Integer totalTime,
        Integer version) {}
