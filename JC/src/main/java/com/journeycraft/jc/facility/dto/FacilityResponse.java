package com.journeycraft.jc.facility.dto;

import com.journeycraft.jc.facility.entity.Facility;

public record FacilityResponse(Long id, String name, String category, Double latitude, Double longitude, Double distance) {
    public static FacilityResponse from(Facility f, Double distance) {
        return new FacilityResponse(f.getId(), f.getName(), f.getCategory(), f.getLatitude(), f.getLongitude(), distance);
    }
}
