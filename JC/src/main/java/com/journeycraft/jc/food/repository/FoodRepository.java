package com.journeycraft.jc.food.repository;

import com.journeycraft.jc.food.entity.Food;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FoodRepository extends JpaRepository<Food, Long> {

    Page<Food> findBySpotId(Long spotId, Pageable pageable);

    Page<Food> findByCuisine(String cuisine, Pageable pageable);

    @Query("SELECT f FROM Food f WHERE (LOWER(f.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(f.restaurantName) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Food> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT f FROM Food f WHERE (LOWER(f.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(f.restaurantName) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND f.cuisine = :cuisine")
    Page<Food> searchByKeywordAndCuisine(@Param("keyword") String keyword, @Param("cuisine") String cuisine, Pageable pageable);

    Page<Food> findBySpotIdOrderByPopularityDesc(Long spotId, Pageable pageable);

    Page<Food> findBySpotIdOrderByAvgRatingDesc(Long spotId, Pageable pageable);

    @Query("SELECT f FROM Food f WHERE f.spotId = :spotId ORDER BY f.popularity DESC")
    List<Food> findTopKBySpotAndPopularity(@Param("spotId") Long spotId, Pageable pageable);

    @Query("SELECT f FROM Food f WHERE f.spotId = :spotId ORDER BY f.avgRating DESC")
    List<Food> findTopKBySpotAndRating(@Param("spotId") Long spotId, Pageable pageable);
}
