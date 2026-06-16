package com.journeycraft.jc.history.controller;

import com.journeycraft.jc.common.dto.ApiResponse;
import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.history.entity.BrowseHistory;
import com.journeycraft.jc.history.entity.FacilityQueryHistory;
import com.journeycraft.jc.history.entity.RouteHistory;
import com.journeycraft.jc.history.entity.SearchHistory;
import com.journeycraft.jc.history.service.HistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController @RequestMapping("/api/v1/history") @RequiredArgsConstructor
public class HistoryController {
    private final HistoryService historyService;

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<SearchHistory>>> searchHistory(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(historyService.getSearchHistory(page, size)));
    }
    @GetMapping("/browse")
    public ResponseEntity<ApiResponse<PageResponse<BrowseHistory>>> browseHistory(
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(historyService.getBrowseHistory(type, page, size)));
    }
    @GetMapping("/routes")
    public ResponseEntity<ApiResponse<PageResponse<RouteHistory>>> routeHistory(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(historyService.getRouteHistory(page, size)));
    }
    @GetMapping("/facilities")
    public ResponseEntity<ApiResponse<PageResponse<FacilityQueryHistory>>> facilityHistory(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(historyService.getFacilityQueryHistory(page, size)));
    }

    @PostMapping("/browse")
    public ResponseEntity<ApiResponse<Void>> recordBrowse(@RequestBody Map<String, String> body) {
        historyService.recordBrowse(body.get("type"), body.get("targetId"), body.getOrDefault("targetName", ""));
        return ResponseEntity.ok(ApiResponse.success(null, "Recorded"));
    }

    @PostMapping("/search")
    public ResponseEntity<ApiResponse<Void>> recordSearch(@RequestBody Map<String, String> body) {
        historyService.recordSearch(body.get("keyword"), body.get("type"));
        return ResponseEntity.ok(ApiResponse.success(null, "Recorded"));
    }
}
