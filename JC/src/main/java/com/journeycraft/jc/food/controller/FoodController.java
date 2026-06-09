package com.journeycraft.jc.food.controller;

import com.journeycraft.jc.common.dto.ApiResponse;
import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.food.dto.FoodResponse;
import com.journeycraft.jc.food.dto.FoodSearchRequest;
import com.journeycraft.jc.food.service.FoodService;
import com.journeycraft.jc.spot.repository.SpotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class FoodController {

    private final FoodService foodService;
    private final SpotRepository spotRepository;

    @GetMapping("/spots/{spotId}/foods")
    public ResponseEntity<ApiResponse<PageResponse<FoodResponse>>> getFoodsBySpot(
            @PathVariable Long spotId,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String cuisine,
            @RequestParam(defaultValue = "popularity") String sortBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        var request = new FoodSearchRequest(keyword, cuisine, null, sortBy, page, size, null, null);
        return ResponseEntity.ok(ApiResponse.success(foodService.getFoodsBySpot(spotId, request)));
    }

    @GetMapping("/foods/search")
    public ResponseEntity<ApiResponse<PageResponse<FoodResponse>>> searchFoods(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String cuisine,
            @RequestParam(required = false) String restaurantName,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        var request = new FoodSearchRequest(keyword, cuisine, restaurantName, "popularity", page, size, lat, lng);
        return ResponseEntity.ok(ApiResponse.success(foodService.searchGlobalFoods(request)));
    }

    @GetMapping("/foods")
    public ResponseEntity<ApiResponse<PageResponse<FoodResponse>>> listFoods(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String cuisine) {
        var request = new FoodSearchRequest(null, cuisine, null, "popularity", page, size, null, null);
        return ResponseEntity.ok(ApiResponse.success(foodService.searchGlobalFoods(request)));
    }

    /**
     * Nearby foods sorted by actual walking distance (Dijkstra via road graph).
     */
    @GetMapping("/spots/{spotId}/foods/nearby")
    public ResponseEntity<ApiResponse<List<FoodResponse>>> getNearbyFoodsWalking(
            @PathVariable Long spotId,
            @RequestParam(defaultValue = "2000") double maxDistance) {
        var spot = spotRepository.findById(spotId).orElse(null);
        if (spot == null) {
            return ResponseEntity.ok(ApiResponse.success(List.of()));
        }
        var result = foodService.getNearbyFoodsWalkingDistance(
                spot.getLatitude(), spot.getLongitude(), maxDistance);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/foods/{id}")
    public ResponseEntity<ApiResponse<FoodResponse>> getFoodById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(foodService.getFoodById(id)));
    }

    @PostMapping("/foods/{id}/rate")
    public ResponseEntity<ApiResponse<FoodResponse>> rateFood(
            @PathVariable Long id, @RequestParam int rating) {
        return ResponseEntity.ok(ApiResponse.success(foodService.rateFood(id, rating)));
    }
}
