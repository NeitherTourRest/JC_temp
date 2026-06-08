package com.journeycraft.jc.spot.service;

import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.common.exception.ResourceNotFoundException;
import com.journeycraft.jc.food.dto.FoodResponse;
import com.journeycraft.jc.food.entity.Food;
import com.journeycraft.jc.food.repository.FoodRepository;
import com.journeycraft.jc.navigation.algorithm.TopKSorter;
import com.journeycraft.jc.spot.dto.*;
import com.journeycraft.jc.spot.entity.Spot;
import com.journeycraft.jc.spot.repository.SpotRepository;
import com.journeycraft.jc.spot.repository.SpotReviewRepository;
import com.journeycraft.jc.user.repository.UserPreferenceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SpotService {

    private final SpotRepository spotRepository;
    private final SpotReviewRepository spotReviewRepository;
    private final FoodRepository foodRepository;
    private final UserPreferenceRepository userPreferenceRepository;

    @Transactional(readOnly = true)
    public PageResponse<SpotResponse> searchSpots(SpotSearchRequest request) {
        var pageable = PageRequest.of(request.page(), request.size());
        org.springframework.data.domain.Page<Spot> page;

        if (request.keyword() != null && !request.keyword().isBlank()) {
            if (request.category() != null && !request.category().isBlank()) {
                page = spotRepository.searchByKeywordAndCategory(request.keyword(), request.category(), pageable);
            } else {
                page = spotRepository.searchByKeyword(request.keyword(), pageable);
            }
        } else if (request.category() != null && !request.category().isBlank()) {
            page = spotRepository.findByCategory(request.category(), pageable);
        } else if ("rating".equalsIgnoreCase(request.sortBy())) {
            page = spotRepository.findAllByOrderByAvgRatingDesc(pageable);
        } else {
            page = spotRepository.findAllByOrderByPopularityDesc(pageable);
        }

        var content = page.getContent().stream().map(SpotResponse::from).toList();
        return PageResponse.of(content, page.getNumber(), page.getSize(), page.getTotalElements());
    }

    @Transactional(readOnly = true)
    public List<SpotResponse> recommendTopK(int topK, Long userId) {
        var allSpots = spotRepository.findAll();

        // If userId is provided, personalize by matching interest categories
        Set<String> userInterestCats = new HashSet<>();
        if (userId != null) {
            userPreferenceRepository.findByUserId(userId).ifPresent(pref -> {
                if (pref.getInterestCategories() != null) {
                    userInterestCats.addAll(Arrays.asList(pref.getInterestCategories().split(",")));
                }
            });
        }

        // Score: popularity base + interest match bonus
        var scored = allSpots.stream().map(spot -> {
            double score = spot.getPopularity();
            if (!userInterestCats.isEmpty() && spot.getCategory() != null
                    && userInterestCats.contains(spot.getCategory())) {
                score += 500; // Interest match bonus
            }
            return new AbstractMap.SimpleEntry<>(spot, score);
        }).sorted((a, b) -> Double.compare(b.getValue(), a.getValue()))
          .limit(topK)
          .map(e -> SpotResponse.from(e.getKey()))
          .toList();

        return scored;
    }

    @Transactional(readOnly = true)
    public SpotDetailResponse getSpotDetail(Long id) {
        var spot = spotRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Spot", id));

        // Increment popularity
        spot.setPopularity(spot.getPopularity() + 1);
        spotRepository.save(spot);

        // Get top 5 recommended foods using TopKSorter
        var foods = foodRepository.findBySpotId(id, PageRequest.of(0, 100));
        var topFoods = TopKSorter.topK(foods.getContent(), 5,
                Comparator.comparingInt(Food::getPopularity).reversed());
        var foodResponses = topFoods.stream().map(FoodResponse::from).toList();

        // Get recent reviews
        var reviews = spotReviewRepository.findBySpotIdOrderByCreatedAtDesc(id, PageRequest.of(0, 5));
        var reviewResponses = reviews.getContent().stream().map(SpotReviewResponse::from).toList();

        return SpotDetailResponse.from(spot, foodResponses, reviewResponses);
    }
}
