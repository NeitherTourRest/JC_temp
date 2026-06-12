package com.journeycraft.jc.itinerary.dto;

public record CollaboratorResponse(
        Long userId,
        String role,
        String nickname) {}
