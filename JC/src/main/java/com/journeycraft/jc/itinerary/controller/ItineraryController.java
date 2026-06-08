package com.journeycraft.jc.itinerary.controller;

import com.journeycraft.jc.common.dto.ApiResponse;
import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.itinerary.dto.*;
import com.journeycraft.jc.itinerary.service.ItineraryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/itineraries")
@RequiredArgsConstructor
public class ItineraryController {

    private final ItineraryService itineraryService;

    @PostMapping
    public ResponseEntity<ApiResponse<ItineraryResponse>> create(@Valid @RequestBody ItineraryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(itineraryService.create(request)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ItineraryResponse>>> list(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(itineraryService.list(page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ItineraryResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(itineraryService.get(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ItineraryResponse>> update(@PathVariable Long id, @Valid @RequestBody ItineraryRequest request) {
        return ResponseEntity.ok(ApiResponse.success(itineraryService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        itineraryService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Itinerary deleted"));
    }
}
