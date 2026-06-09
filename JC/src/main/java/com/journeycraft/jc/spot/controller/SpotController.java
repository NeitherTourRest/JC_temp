package com.journeycraft.jc.spot.controller;

import com.journeycraft.jc.common.dto.ApiResponse;
import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.spot.dto.*;
import com.journeycraft.jc.spot.service.SpotService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/spots")
@RequiredArgsConstructor
public class SpotController {

    private final SpotService spotService;

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<SpotResponse>>> searchSpots(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "popularity") String sortBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        var request = new SpotSearchRequest(keyword, category, sortBy, page, size);
        return ResponseEntity.ok(ApiResponse.success(spotService.searchSpots(request)));
    }

    @GetMapping("/recommend")
    public ResponseEntity<ApiResponse<List<SpotResponse>>> recommend(
            @RequestParam(defaultValue = "10") int topK,
            @RequestParam(required = false) Long userId) {
        return ResponseEntity.ok(ApiResponse.success(spotService.recommendTopK(topK, userId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SpotDetailResponse>> getSpotDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(spotService.getSpotDetail(id)));
    }

    @PostMapping("/{id}/rate")
    public ResponseEntity<ApiResponse<SpotDetailResponse>> rateSpot(
            @PathVariable Long id, @RequestParam int rating) {
        return ResponseEntity.ok(ApiResponse.success(spotService.rateSpot(id, rating)));
    }

    @PostMapping("/{id}/congestion")
    public ResponseEntity<ApiResponse<SpotDetailResponse>> reportCongestion(
            @PathVariable Long id, @RequestParam String level) {
        return ResponseEntity.ok(ApiResponse.success(spotService.reportCongestion(id, level)));
    }
}
