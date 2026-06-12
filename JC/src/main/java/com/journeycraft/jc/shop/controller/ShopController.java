package com.journeycraft.jc.shop.controller;

import com.journeycraft.jc.common.dto.ApiResponse;
import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.shop.dto.ShopResponse;
import com.journeycraft.jc.shop.entity.Shop;
import com.journeycraft.jc.shop.repository.ShopRepository;
import com.journeycraft.jc.shop.service.ShopService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/shops")
@RequiredArgsConstructor
public class ShopController {

    private final ShopRepository shopRepository;
    private final ShopService shopService;

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<ShopResponse>>> searchShops(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        var pageable = PageRequest.of(page, size);
        Page<Shop> result;
        if (keyword != null && !keyword.isBlank()) {
            result = shopRepository.searchByKeyword(keyword, pageable);
        } else {
            result = shopRepository.findAll(pageable);
        }
        var content = result.getContent().stream()
                .map(ShopResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(
                PageResponse.of(content, result.getNumber(), result.getSize(), result.getTotalElements())));
    }

    @GetMapping("/by-spot/{spotId}")
    public ResponseEntity<ApiResponse<List<ShopResponse>>> getShopsBySpot(@PathVariable Long spotId) {
        var shops = shopRepository.findBySpotId(spotId).stream()
                .map(ShopResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(shops));
    }

    @GetMapping("/top")
    public ResponseEntity<ApiResponse<List<ShopResponse>>> getTopShops() {
        var shops = shopRepository.findTop20ByOrderByPopularityDesc().stream()
                .map(ShopResponse::from)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(shops));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ShopResponse>> getShopById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(shopService.getShopById(id)));
    }

    @PostMapping("/{id}/rate")
    public ResponseEntity<ApiResponse<ShopResponse>> rateShop(
            @PathVariable Long id, @RequestParam int rating) {
        return ResponseEntity.ok(ApiResponse.success(shopService.rateShop(id, rating)));
    }

    @PostMapping("/{id}/congestion")
    public ResponseEntity<ApiResponse<ShopResponse>> reportCongestion(
            @PathVariable Long id, @RequestParam String level) {
        return ResponseEntity.ok(ApiResponse.success(shopService.reportCongestion(id, level)));
    }
}
