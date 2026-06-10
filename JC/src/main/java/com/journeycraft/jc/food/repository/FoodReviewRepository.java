package com.journeycraft.jc.food.repository;

import com.journeycraft.jc.food.entity.FoodReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FoodReviewRepository extends JpaRepository<FoodReview, Long> {
    List<FoodReview> findByFoodId(Long foodId);
    java.util.Optional<FoodReview> findByFoodIdAndUserId(Long foodId, Long userId);
}
