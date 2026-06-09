package com.journeycraft.jc.spot.service;

import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.common.exception.BadRequestException;
import com.journeycraft.jc.common.exception.ResourceNotFoundException;
import com.journeycraft.jc.facility.dto.FacilityResponse;
import com.journeycraft.jc.facility.repository.FacilityRepository;
import com.journeycraft.jc.food.dto.FoodResponse;
import com.journeycraft.jc.food.entity.Food;
import com.journeycraft.jc.food.repository.FoodRepository;
import com.journeycraft.jc.navigation.algorithm.TopKSorter;
import com.journeycraft.jc.spot.dto.*;
import com.journeycraft.jc.spot.entity.CongestionReport;
import com.journeycraft.jc.spot.entity.Spot;
import com.journeycraft.jc.spot.entity.SpotReview;
import com.journeycraft.jc.spot.repository.CongestionReportRepository;
import com.journeycraft.jc.spot.repository.SpotRepository;
import com.journeycraft.jc.spot.repository.SpotReviewRepository;
import com.journeycraft.jc.user.entity.User;
import com.journeycraft.jc.user.repository.UserPreferenceRepository;
import com.journeycraft.jc.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SpotService {

    private final SpotRepository spotRepository;
    private final SpotReviewRepository spotReviewRepository;
    private final FoodRepository foodRepository;
    private final FacilityRepository facilityRepository;
    private final CongestionReportRepository congestionReportRepository;
    private final UserRepository userRepository;
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

        // Get facilities inside this spot
        var facilities = facilityRepository.findBySpotId(id);
        var facilityResponses = facilities.stream().map(f -> FacilityResponse.from(f, null)).toList();

        return SpotDetailResponse.from(spot, foodResponses, reviewResponses, facilityResponses);
    }

    /**
     * Submit a user rating (1-5) for a spot. Recalculates the average rating.
     * If the user has already rated this spot, updates the existing rating.
     */
    @Transactional
    public SpotDetailResponse rateSpot(Long id, int rating) {
        if (rating < 1 || rating > 5) {
            throw new BadRequestException("Rating must be between 1 and 5");
        }
        var spot = spotRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Spot", id));

        var user = getCurrentUser();

        // Find existing review from this user for this spot
        var existingReviews = spotReviewRepository.findBySpotId(id, PageRequest.of(0, 100));
        var existing = existingReviews.getContent().stream()
                .filter(r -> r.getUserId().equals(user.getId()))
                .findFirst();

        if (existing.isPresent()) {
            existing.get().setRating(rating);
            spotReviewRepository.save(existing.get());
        } else {
            var review = SpotReview.builder()
                    .spot(spot).userId(user.getId()).rating(rating).build();
            spotReviewRepository.save(review);
            spot.setRatingCount(spot.getRatingCount() + 1);
        }

        // Recalculate average rating across all reviews
        var allReviews = spotReviewRepository.findBySpotId(id, PageRequest.of(0, 10000));
        double avg = allReviews.getContent().stream()
                .mapToInt(SpotReview::getRating)
                .average().orElse(0.0);
        spot.setAvgRating(BigDecimal.valueOf(Math.round(avg * 100.0) / 100.0));
        spotRepository.save(spot);

        return getSpotDetail(id);
    }

    /**
     * Report congestion level for a spot. Uses time-weighted scoring:
     * - Reports within the last 30 minutes get full weight (1.0)
     * - Reports between 30-60 minutes get medium weight (0.5)
     * - Reports older than 60 minutes get low weight (0.2)
     * Computes a weighted average to determine the displayed congestion level.
     */
    @Transactional
    public SpotDetailResponse reportCongestion(Long id, String level) {
        var validLevels = Set.of("OVERFLOWING", "CROWDED", "MODERATE", "SPARSE", "EMPTY");
        if (!validLevels.contains(level)) {
            throw new BadRequestException("Invalid congestion level: " + level +
                    ". Valid: OVERFLOWING, CROWDED, MODERATE, SPARSE, EMPTY");
        }
        var spot = spotRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Spot", id));

        var user = getCurrentUser();

        // Save report
        var report = CongestionReport.builder()
                .spotId(id).userId(user.getId()).level(level).build();
        congestionReportRepository.save(report);

        // Compute weighted congestion score from recent reports
        var now = LocalDateTime.now();
        var recentReports = congestionReportRepository
                .findBySpotIdAndCreatedAtAfterOrderByCreatedAtDesc(id, now.minusHours(2));

        double totalWeight = 0;
        double weightedSum = 0;

        for (var r : recentReports) {
            double minutesAgo = java.time.Duration.between(r.getCreatedAt(), now).toMinutes();
            double weight;
            if (minutesAgo <= 30) weight = 1.0;
            else if (minutesAgo <= 60) weight = 0.5;
            else weight = 0.2;

            double numericLevel = switch (r.getLevel()) {
                case "OVERFLOWING" -> 5.0;
                case "CROWDED" -> 4.0;
                case "MODERATE" -> 3.0;
                case "SPARSE" -> 2.0;
                default -> 1.0; // EMPTY
            };

            weightedSum += numericLevel * weight;
            totalWeight += weight;
        }

        // Map weighted average back to congestion level
        if (totalWeight > 0) {
            double avg = weightedSum / totalWeight;
            String finalLevel;
            if (avg >= 4.5) finalLevel = "OVERFLOWING";
            else if (avg >= 3.5) finalLevel = "CROWDED";
            else if (avg >= 2.5) finalLevel = "MODERATE";
            else if (avg >= 1.5) finalLevel = "SPARSE";
            else finalLevel = "EMPTY";
            spot.setCongestionLevel(finalLevel);
        } else {
            spot.setCongestionLevel(level);
        }
        spotRepository.save(spot);

        return getSpotDetail(id);
    }

    private User getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
