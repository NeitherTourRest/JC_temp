package com.journeycraft.jc.itinerary.dto;

import java.time.LocalDateTime;

public record InvitationResponse(
        Long id,
        Long itineraryId,
        String itineraryName,
        Long inviterId,
        String inviterName,
        String status,
        LocalDateTime createdAt) {}
