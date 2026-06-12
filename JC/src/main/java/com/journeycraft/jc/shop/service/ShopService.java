package com.journeycraft.jc.shop.service;

import com.journeycraft.jc.common.exception.BadRequestException;
import com.journeycraft.jc.common.exception.ResourceNotFoundException;
import com.journeycraft.jc.common.service.CongestionService;
import com.journeycraft.jc.shop.dto.ShopResponse;
import com.journeycraft.jc.shop.entity.Shop;
import com.journeycraft.jc.shop.entity.ShopReview;
import com.journeycraft.jc.shop.repository.ShopRepository;
import com.journeycraft.jc.shop.repository.ShopReviewRepository;
import com.journeycraft.jc.user.entity.User;
import com.journeycraft.jc.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class ShopService {

    private final ShopRepository shopRepository;
    private final ShopReviewRepository shopReviewRepository;
    private final UserRepository userRepository;
    private final CongestionService congestionService;

    @Transactional(readOnly = true)
    public ShopResponse getShopById(Long id) {
        var shop = shopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shop", id));
        shop.setPopularity(shop.getPopularity() + 1);
        shopRepository.save(shop);
        String congestion = congestionService.computeLevel("SHOP", id);
        return new ShopResponse(
                shop.getId(), shop.getName(), shop.getAddress(),
                shop.getDescription(), shop.getLatitude(), shop.getLongitude(),
                com.journeycraft.jc.common.util.CoordinateConverter.wgs84ToGcj02(
                        shop.getLatitude(), shop.getLongitude())[0],
                com.journeycraft.jc.common.util.CoordinateConverter.wgs84ToGcj02(
                        shop.getLatitude(), shop.getLongitude())[1],
                shop.getCuisine(), shop.getSpotId(),
                shop.getAvgRating(), shop.getRatingCount(), shop.getPopularity(),
                congestion, shop.getImageUrl(),
                shop.getCreatedAt());
    }

    @Transactional
    public ShopResponse rateShop(Long id, int rating) {
        if (rating < 1 || rating > 5) {
            throw new BadRequestException("Rating must be between 1 and 5");
        }
        var shop = shopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shop", id));
        var user = getCurrentUser();

        var existing = shopReviewRepository.findByShopIdAndUserId(id, user.getId());
        if (existing.isPresent()) {
            existing.get().setRating(rating);
            shopReviewRepository.save(existing.get());
        } else {
            ShopReview review = ShopReview.builder()
                    .shopId(id).userId(user.getId()).rating(rating).build();
            shopReviewRepository.save(review);
        }

        var allReviews = shopReviewRepository.findByShopId(id);
        double avg = allReviews.stream()
                .mapToInt(ShopReview::getRating)
                .average().orElse(0.0);
        shop.setAvgRating(java.math.BigDecimal.valueOf(Math.round(avg * 100.0) / 100.0));
        shop.setRatingCount(allReviews.size());

        String congestion = congestionService.computeLevel("SHOP", id);
        shop.setCongestionLevel(congestion);
        shopRepository.save(shop);

        return getShopById(id);
    }

    @Transactional
    public ShopResponse reportCongestion(Long id, String level) {
        var validLevels = Set.of("OVERFLOWING", "CROWDED", "MODERATE", "SPARSE", "EMPTY");
        if (!validLevels.contains(level)) {
            throw new BadRequestException("Invalid congestion level: " + level);
        }
        var shop = shopRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Shop", id));
        var user = getCurrentUser();

        String newLevel = congestionService.report("SHOP", id, user.getId(), level);
        shop.setCongestionLevel(newLevel);
        shopRepository.save(shop);

        return getShopById(id);
    }

    private User getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
