package com.journeycraft.jc.food.service;

import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.common.exception.BadRequestException;
import com.journeycraft.jc.common.exception.ResourceNotFoundException;
import com.journeycraft.jc.food.dto.FoodResponse;
import com.journeycraft.jc.food.dto.FoodSearchRequest;
import com.journeycraft.jc.food.repository.FoodRepository;
import com.journeycraft.jc.navigation.algorithm.DijkstraAlgorithm;
import com.journeycraft.jc.navigation.algorithm.FuzzyMatcher;
import com.journeycraft.jc.navigation.graph.Graph;
import com.journeycraft.jc.spot.repository.SpotRepository;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FoodService {

    private final FoodRepository foodRepository;
    private final com.journeycraft.jc.navigation.graph.Graph navigationGraph;
    private final SpotRepository spotRepository;

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

    /**
     * Find nearby foods sorted by actual walking distance (Dijkstra on road graph).
     * Uses computeAllDistances() for a single O((V+E) log V) pass, then looks up
     * each food's distance from the precomputed map. Falls back to Haversine.
     */
    @Transactional(readOnly = true)
    public List<FoodResponse> getNearbyFoodsWalkingDistance(double lat, double lng, double maxDistanceMeters) {
        var spotNode = navigationGraph.findNearestNode(lat, lng);
        var allFoods = foodRepository.findAll();

        // Compute all distances from spot node in one pass (avoids per-food Dijkstra)
        var distMap = spotNode != null
                ? DijkstraAlgorithm.computeAllDistances(navigationGraph, spotNode.getNodeId(), "DISTANCE")
                : java.util.Collections.<String, Double>emptyMap();

        // Map food -> walking distance, filter by range
        return allFoods.stream().map(food -> {
            double walkingDist;
            var foodNode = navigationGraph.findNearestNode(food.getLatitude(), food.getLongitude());
            if (spotNode != null && foodNode != null && distMap.containsKey(foodNode.getNodeId())) {
                walkingDist = distMap.get(foodNode.getNodeId());
            } else {
                walkingDist = Graph.haversineDistance(lat, lng, food.getLatitude(), food.getLongitude());
            }
            return java.util.Map.entry(walkingDist, food);
        }).filter(e -> e.getKey() <= maxDistanceMeters)
          .sorted(java.util.Map.Entry.comparingByKey())
          .map(e -> FoodResponse.from(e.getValue()))
          .toList();
    }

    @Transactional(readOnly = true)
    public FoodResponse getFoodById(Long id) {
        var food = foodRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Food", id));
        food.setPopularity(food.getPopularity() + 1);
        foodRepository.save(food);

        // Look up congestion from parent spot
        String congestion = null;
        if (food.getSpotId() != null) {
            congestion = spotRepository.findById(food.getSpotId())
                    .map(s -> s.getCongestionLevel())
                    .orElse(null);
        }
        return FoodResponse.withCongestion(food, congestion);
    }

    @Transactional
    public FoodResponse rateFood(Long id, int rating) {
        if (rating < 1 || rating > 5) {
            throw new BadRequestException("Rating must be between 1 and 5");
        }
        var food = foodRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Food", id));

        int prevCount = food.getRatingCount() != null ? food.getRatingCount() : 0;
        double prevAvg = food.getAvgRating() != null ? food.getAvgRating().doubleValue() : 0.0;
        double newAvg = ((prevAvg * prevCount) + rating) / (prevCount + 1);
        food.setAvgRating(java.math.BigDecimal.valueOf(Math.round(newAvg * 100.0) / 100.0));
        food.setRatingCount(prevCount + 1);
        foodRepository.save(food);

        // Reload with congestion
        return getFoodById(id);
    }
}
