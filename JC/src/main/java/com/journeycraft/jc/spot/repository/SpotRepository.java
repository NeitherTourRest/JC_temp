package com.journeycraft.jc.spot.repository;

import com.journeycraft.jc.spot.entity.Spot;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpotRepository extends JpaRepository<Spot, Long> {

    Page<Spot> findByCategory(String category, Pageable pageable);

    @Query("SELECT s FROM Spot s WHERE LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.description) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Spot> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT s FROM Spot s WHERE (LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.description) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND s.category = :category")
    Page<Spot> searchByKeywordAndCategory(@Param("keyword") String keyword, @Param("category") String category, Pageable pageable);

    List<Spot> findTop10ByOrderByPopularityDesc();

    List<Spot> findTop10ByOrderByAvgRatingDesc();

    @Query("SELECT s FROM Spot s ORDER BY s.popularity DESC")
    List<Spot> findTopKByPopularity(Pageable pageable);

    @Query("SELECT s FROM Spot s ORDER BY s.avgRating DESC")
    List<Spot> findTopKByRating(Pageable pageable);

    Page<Spot> findAllByOrderByPopularityDesc(Pageable pageable);

    Page<Spot> findAllByOrderByAvgRatingDesc(Pageable pageable);
}
