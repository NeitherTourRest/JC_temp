package com.journeycraft.jc.facility.dto;

import com.journeycraft.jc.common.util.CoordinateConverter;
import com.journeycraft.jc.facility.entity.Facility;

public record FacilityResponse(Long id, String name, String category,
                               Double latitude, Double longitude,
                               Double gcjLatitude, Double gcjLongitude,
                               Double distance) {
    public static FacilityResponse from(Facility f, Double distance) {
        double[] gcj = CoordinateConverter.wgs84ToGcj02(f.getLatitude(), f.getLongitude());
        return new FacilityResponse(f.getId(), f.getName(), f.getCategory(),
                f.getLatitude(), f.getLongitude(),
                gcj[0], gcj[1], distance);
    }
}
