package com.journeycraft.jc.food.service;

import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.common.exception.ResourceNotFoundException;
import com.journeycraft.jc.food.dto.FoodResponse;
import com.journeycraft.jc.food.dto.FoodSearchRequest;
import com.journeycraft.jc.food.repository.FoodRepository;
import com.journeycraft.jc.navigation.algorithm.FuzzyMatcher;
import java.util.Comparator;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FoodService {

    private final FoodRepository foodRepository;
    private final com.journeycraft.jc.navigation.graph.Graph navigationGraph;

    @Transactional(readOnly = true)
    public PageResponse<FoodResponse> searchFoods(FoodSearchRequest request) {
        var pageable = PageRequest.of(request.page(), request.size());
        var page = foodRepository.searchByKeyword(
                request.keyword() != null ? request.keyword() : "", pageable);

        var content = page.getContent().stream()
                .map(FoodResponse::from)
                .toList();
        return PageResponse.of(content, page.getNumber(), page.getSize(), page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public PageResponse<FoodResponse> getFoodsBySpot(Long spotId, FoodSearchRequest request) {
        var pageable = PageRequest.of(request.page(), request.size());
        var page = foodRepository.findBySpotIdOrderByPopularityDesc(spotId, pageable);

        var content = page.getContent().stream()
                .map(FoodResponse::from)
                .toList();
        return PageResponse.of(content, page.getNumber(), page.getSize(), page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public PageResponse<FoodResponse> searchGlobalFoods(FoodSearchRequest request) {
        var pageable = PageRequest.of(request.page(), request.size());
        var page = foodRepository.searchByKeyword(
                request.keyword() != null ? request.keyword() : "", pageable);

        var foods = page.getContent();
        if (request.keyword() != null && !request.keyword().isBlank()) {
            foods = foods.stream()
                    .filter(f -> FuzzyMatcher.matches(f.getName(), request.keyword(), 2) ||
                                  FuzzyMatcher.matches(f.getCuisine(), request.keyword(), 2) ||
                                  FuzzyMatcher.matches(f.getRestaurantName(), request.keyword(), 2))
                    .toList();
        }

        // Sort by distance if requested and coordinates provided
        if ("distance".equalsIgnoreCase(request.sortBy()) && request.lat() != null && request.lng() != null) {
            double lat = request.lat(), lng = request.lng();
            foods = foods.stream()
                    .sorted(Comparator.comparingDouble(f ->
                            com.journeycraft.jc.navigation.graph.Graph.haversineDistance(lat, lng, f.getLatitude(), f.getLongitude())))
                    .toList();
        }

        var content = foods.stream().map(FoodResponse::from).toList();
        return PageResponse.of(content, page.getNumber(), page.getSize(),
                request.keyword() != null ? content.size() : page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public FoodResponse getFoodById(Long id) {
        var food = foodRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Food", id));
        food.setPopularity(food.getPopularity() + 1);
        foodRepository.save(food);
        return FoodResponse.from(food);
    }
}
