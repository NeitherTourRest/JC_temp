package com.journeycraft.jc.itinerary.repository;

import com.journeycraft.jc.itinerary.entity.ItineraryInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ItineraryInvitationRepository extends JpaRepository<ItineraryInvitation, Long> {
    List<ItineraryInvitation> findByInviteeIdAndStatus(Long inviteeId, String status);
    List<ItineraryInvitation> findByInviteeId(Long inviteeId);
    Optional<ItineraryInvitation> findByItineraryIdAndInviteeId(Long itineraryId, Long inviteeId);
    Optional<ItineraryInvitation> findByItineraryIdAndInviteeIdAndStatus(Long itineraryId, Long inviteeId, String status);
}
