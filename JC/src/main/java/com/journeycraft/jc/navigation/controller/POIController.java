package com.journeycraft.jc.navigation.controller;

import com.journeycraft.jc.common.dto.ApiResponse;
import com.journeycraft.jc.navigation.service.POISearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/navigation")
@RequiredArgsConstructor
public class POIController {

    private final POISearchService poiSearchService;

    @GetMapping("/poi/search")
    public ResponseEntity<ApiResponse<List<POISearchService.POI>>> searchPOI(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "20") int maxResults) {
        return ResponseEntity.ok(ApiResponse.success(poiSearchService.search(keyword, maxResults)));
    }

    @GetMapping("/poi/nearby")
    public ResponseEntity<ApiResponse<List<POISearchService.POI>>> nearbyPOI(
            @RequestParam double lat,
            @RequestParam double lon,
            @RequestParam(defaultValue = "20") int maxResults) {
        return ResponseEntity.ok(ApiResponse.success(poiSearchService.getNearby(lat, lon, maxResults)));
    }
}
