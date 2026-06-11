package com.journeycraft.jc.itinerary.repository;

import com.journeycraft.jc.itinerary.entity.Itinerary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ItineraryRepository extends JpaRepository<Itinerary, Long> {
    Page<Itinerary> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    @Query("SELECT i FROM Itinerary i WHERE i.userId = :userId AND (LOWER(i.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(i.routeData) LIKE LOWER(CONCAT('%', :keyword, '%'))) ORDER BY i.createdAt DESC")
    Page<Itinerary> searchByUserIdAndKeyword(@Param("userId") Long userId, @Param("keyword") String keyword, Pageable pageable);
}
