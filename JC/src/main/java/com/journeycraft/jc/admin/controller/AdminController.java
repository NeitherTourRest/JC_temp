package com.journeycraft.jc.admin.controller;

import com.journeycraft.jc.common.dto.ApiResponse;
import com.journeycraft.jc.facility.service.FacilityDataService;
import com.journeycraft.jc.shop.service.ShopDataService;
import com.journeycraft.jc.spot.service.SpotDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final SpotDataService spotDataService;
    private final FacilityDataService facilityDataService;
    private final ShopDataService shopDataService;

    @PostMapping("/spots/refresh")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> refreshSpots() {
        int count = spotDataService.refreshSpots();
        return ResponseEntity.ok(ApiResponse.success(Map.of("spots", count)));
    }

    @PostMapping("/facilities/refresh")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> refreshFacilities() {
        int count = facilityDataService.refreshFacilities();
        return ResponseEntity.ok(ApiResponse.success(Map.of("facilities", count)));
    }

    @PostMapping("/shops/refresh")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> refreshShops() {
        int count = shopDataService.refreshShops();
        return ResponseEntity.ok(ApiResponse.success(Map.of("shops", count)));
    }

    @PostMapping("/refresh-all")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> refreshAll() {
        int spots = spotDataService.refreshSpots();
        int shops = shopDataService.refreshShops();
        int facilities = facilityDataService.refreshFacilities();
        return ResponseEntity.ok(ApiResponse.success(Map.of("spots", spots, "shops", shops, "facilities", facilities)));
    }
}
