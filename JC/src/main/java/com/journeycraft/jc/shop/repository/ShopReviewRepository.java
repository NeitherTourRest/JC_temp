package com.journeycraft.jc.shop.repository;

import com.journeycraft.jc.shop.entity.ShopReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShopReviewRepository extends JpaRepository<ShopReview, Long> {
    List<ShopReview> findByShopId(Long shopId);
    Optional<ShopReview> findByShopIdAndUserId(Long shopId, Long userId);
}
