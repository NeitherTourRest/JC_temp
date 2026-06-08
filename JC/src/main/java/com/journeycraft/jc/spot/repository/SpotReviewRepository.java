package com.journeycraft.jc.spot.repository;

import com.journeycraft.jc.spot.entity.SpotReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SpotReviewRepository extends JpaRepository<SpotReview, Long> {
    Page<SpotReview> findBySpotId(Long spotId, Pageable pageable);
    Page<SpotReview> findBySpotIdOrderByCreatedAtDesc(Long spotId, Pageable pageable);
}
