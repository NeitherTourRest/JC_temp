package com.journeycraft.jc.food.service;

import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.common.exception.BadRequestException;
import com.journeycraft.jc.common.exception.ResourceNotFoundException;
import com.journeycraft.jc.common.service.CongestionService;
import com.journeycraft.jc.food.dto.FoodResponse;
import com.journeycraft.jc.food.dto.FoodSearchRequest;
import com.journeycraft.jc.food.entity.Food;
import com.journeycraft.jc.food.entity.FoodReview;
import com.journeycraft.jc.food.repository.FoodRepository;
import com.journeycraft.jc.food.repository.FoodReviewRepository;
import com.journeycraft.jc.navigation.algorithm.DijkstraAlgorithm;
import com.journeycraft.jc.navigation.algorithm.FuzzyMatcher;
import com.journeycraft.jc.navigation.graph.Graph;
import com.journeycraft.jc.spot.repository.SpotRepository;
import com.journeycraft.jc.user.entity.User;
import com.journeycraft.jc.user.repository.UserRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class FoodService {

    private final FoodRepository foodRepository;
    private final FoodReviewRepository foodReviewRepository;
    private final UserRepository userRepository;
    private final CongestionService congestionService;
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

        // Update congestion from current votes
        String congestion = congestionService.computeLevel("FOOD", id);
        return FoodResponse.withCongestion(food, congestion);
    }

    @Transactional
    public FoodResponse reportCongestion(Long id, String level) {
        var validLevels = Set.of("OVERFLOWING", "CROWDED", "MODERATE", "SPARSE", "EMPTY");
        if (!validLevels.contains(level)) {
            throw new BadRequestException("Invalid congestion level: " + level);
        }
        var food = foodRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Food", id));
        var user = getCurrentUser();

        String newLevel = congestionService.report("FOOD", id, user.getId(), level);
        food.setCongestionLevel(newLevel);
        foodRepository.save(food);

        return getFoodById(id);
    }

    @Transactional
    public FoodResponse rateFood(Long id, int rating) {
        if (rating < 1 || rating > 5) {
            throw new BadRequestException("Rating must be between 1 and 5");
        }
        var food = foodRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Food", id));

        var user = getCurrentUser();

        // Upsert: update existing review or create new one
        var existing = foodReviewRepository.findByFoodIdAndUserId(id, user.getId());
        boolean isNew = existing.isEmpty();
        if (existing.isPresent()) {
            existing.get().setRating(rating);
            foodReviewRepository.save(existing.get());
        } else {
            FoodReview review = FoodReview.builder()
                    .foodId(id).userId(user.getId()).rating(rating).build();
            foodReviewRepository.save(review);
        }

        // Recalculate average rating from all reviews
        var allReviews = foodReviewRepository.findByFoodId(id);
        double avg = allReviews.stream()
                .mapToInt(FoodReview::getRating)
                .average().orElse(0.0);
        food.setAvgRating(java.math.BigDecimal.valueOf(Math.round(avg * 100.0) / 100.0));
        if (isNew) {
            food.setRatingCount(food.getRatingCount() != null ? food.getRatingCount() + 1 : 1);
        }
        foodRepository.save(food);

        return getFoodById(id);
    }

    private User getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
