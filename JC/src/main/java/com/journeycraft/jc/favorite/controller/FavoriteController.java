package com.journeycraft.jc.favorite.controller;

import com.journeycraft.jc.common.dto.ApiResponse;
import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.favorite.dto.*;
import com.journeycraft.jc.favorite.service.FavoriteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/favorites") @RequiredArgsConstructor
public class FavoriteController {
    private final FavoriteService favoriteService;

    @PostMapping
    public ResponseEntity<ApiResponse<FavoriteResponse>> add(@Valid @RequestBody FavoriteRequest request) {
        return ResponseEntity.ok(ApiResponse.success(favoriteService.add(request)));
    }
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<FavoriteResponse>>> list(
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(favoriteService.list(type, page, size)));
    }
    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> remove(@RequestParam String type, @RequestParam String targetId) {
        favoriteService.remove(type, targetId);
        return ResponseEntity.ok(ApiResponse.success(null, "Removed"));
    }
}
