package com.journeycraft.jc.facility.repository;

import com.journeycraft.jc.facility.entity.Facility;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FacilityRepository extends JpaRepository<Facility, Long> {
    List<Facility> findBySpotId(Long spotId);
    List<Facility> findBySpotIdAndCategory(Long spotId, String category);
    List<Facility> findByCategory(String category);

    @Query("SELECT f FROM Facility f WHERE " +
           "(6371000 * ACOS(COS(RADIANS(:lat)) * COS(RADIANS(f.latitude)) * COS(RADIANS(f.longitude) - RADIANS(:lng)) + SIN(RADIANS(:lat)) * SIN(RADIANS(f.latitude)))) < :radius")
    List<Facility> findNearby(@Param("lat") double lat, @Param("lng") double lng, @Param("radius") double radius);
}
