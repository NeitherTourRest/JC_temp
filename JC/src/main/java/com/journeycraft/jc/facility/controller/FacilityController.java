package com.journeycraft.jc.facility.controller;

import com.journeycraft.jc.common.dto.ApiResponse;
import com.journeycraft.jc.facility.dto.FacilityResponse;
import com.journeycraft.jc.facility.service.FacilityService;
import com.journeycraft.jc.spot.repository.SpotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor
public class FacilityController {
    private final FacilityService facilityService;
    private final SpotRepository spotRepository;

    @GetMapping("/spots/{spotId}/facilities")
    public ResponseEntity<ApiResponse<List<FacilityResponse>>> getFacilities(
            @PathVariable Long spotId,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "1.0") double range) {
        // Use spot location for proximity, fallback to 0,0 if spot not found
        var spot = spotRepository.findById(spotId).orElse(null);
        double lat = spot != null ? spot.getLatitude() : 0;
        double lng = spot != null ? spot.getLongitude() : 0;
        return ResponseEntity.ok(ApiResponse.success(facilityService.getNearbyFacilities(lat, lng, category, range)));
    }
}
