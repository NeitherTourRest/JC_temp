package com.journeycraft.jc.itinerary.repository;

import com.journeycraft.jc.itinerary.entity.ItineraryCollaborator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ItineraryCollaboratorRepository extends JpaRepository<ItineraryCollaborator, Long> {
    List<ItineraryCollaborator> findByUserId(Long userId);
    List<ItineraryCollaborator> findByItineraryId(Long itineraryId);
    Optional<ItineraryCollaborator> findByItineraryIdAndUserId(Long itineraryId, Long userId);
    void deleteByItineraryIdAndUserId(Long itineraryId, Long userId);
    boolean existsByItineraryIdAndUserId(Long itineraryId, Long userId);
}
