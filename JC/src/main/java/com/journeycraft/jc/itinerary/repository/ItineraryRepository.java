package com.journeycraft.jc.itinerary.repository;

import com.journeycraft.jc.itinerary.entity.Itinerary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ItineraryRepository extends JpaRepository<Itinerary, Long> {
    Page<Itinerary> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}
