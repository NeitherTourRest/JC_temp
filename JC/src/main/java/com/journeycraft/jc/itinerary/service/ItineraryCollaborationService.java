package com.journeycraft.jc.itinerary.service;

import com.journeycraft.jc.common.exception.BadRequestException;
import com.journeycraft.jc.common.exception.ResourceNotFoundException;
import com.journeycraft.jc.itinerary.dto.*;
import com.journeycraft.jc.itinerary.entity.Itinerary;
import com.journeycraft.jc.itinerary.entity.ItineraryCollaborator;
import com.journeycraft.jc.itinerary.entity.ItineraryInvitation;
import com.journeycraft.jc.itinerary.repository.ItineraryCollaboratorRepository;
import com.journeycraft.jc.itinerary.repository.ItineraryInvitationRepository;
import com.journeycraft.jc.itinerary.repository.ItineraryRepository;
import com.journeycraft.jc.user.entity.User;
import com.journeycraft.jc.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ItineraryCollaborationService {

    private final ItineraryRepository itineraryRepository;
    private final ItineraryCollaboratorRepository collaboratorRepository;
    private final ItineraryInvitationRepository invitationRepository;
    private final UserRepository userRepository;

    // ── Invite ──

    @Transactional
    public InvitationResponse invite(Long itineraryId, Long inviteeId) {
        var user = getCurrentUser();
        var itinerary = itineraryRepository.findById(itineraryId)
                .orElseThrow(() -> new ResourceNotFoundException("Itinerary", itineraryId));

        // Check permission: must be owner or editor
        var myCollab = collaboratorRepository.findByItineraryIdAndUserId(itineraryId, user.getId());
        boolean isOwner = itinerary.getUserId().equals(user.getId());
        boolean isEditor = myCollab.isPresent() && "editor".equals(myCollab.get().getRole());
        if (!isOwner && !isEditor) {
            throw new BadRequestException("You don't have permission to invite collaborators");
        }

        if (inviteeId.equals(user.getId())) {
            throw new BadRequestException("You cannot invite yourself");
        }

        var invitee = userRepository.findById(inviteeId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found", inviteeId));

        if (collaboratorRepository.existsByItineraryIdAndUserId(itineraryId, inviteeId)) {
            throw new BadRequestException("User is already a collaborator");
        }

        var existingInvite = invitationRepository.findByItineraryIdAndInviteeId(itineraryId, inviteeId);
        if (existingInvite.isPresent() && "PENDING".equals(existingInvite.get().getStatus())) {
            throw new BadRequestException("Invitation already pending for this user");
        }

        var invitation = ItineraryInvitation.builder()
                .itineraryId(itineraryId)
                .inviterId(user.getId())
                .inviteeId(inviteeId)
                .status("PENDING")
                .build();

        var saved = invitationRepository.save(invitation);
        return toInvitationResponse(saved, itinerary.getName(), user.getNickname() != null ? user.getNickname() : user.getUsername());
    }

    // ── Accept ──

    @Transactional
    public InvitationResponse accept(Long invitationId) {
        var user = getCurrentUser();
        var invite = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation not found", invitationId));

        if (!invite.getInviteeId().equals(user.getId())) {
            throw new BadRequestException("This invitation is not for you");
        }
        if (!"PENDING".equals(invite.getStatus())) {
            throw new BadRequestException("Invitation is not pending");
        }

        invite.setStatus("ACCEPTED");
        invitationRepository.save(invite);

        var collaborator = ItineraryCollaborator.builder()
                .itineraryId(invite.getItineraryId())
                .userId(user.getId())
                .role("editor")
                .build();
        collaboratorRepository.save(collaborator);

        var itinerary = itineraryRepository.findById(invite.getItineraryId()).orElse(null);
        var inviter = userRepository.findById(invite.getInviterId()).orElse(null);
        return toInvitationResponse(invite,
                itinerary != null ? itinerary.getName() : "",
                inviter != null ? inviter.getNickname() : "");
    }

    // ── Reject ──

    @Transactional
    public InvitationResponse reject(Long invitationId) {
        var user = getCurrentUser();
        var invite = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation not found", invitationId));

        if (!invite.getInviteeId().equals(user.getId())) {
            throw new BadRequestException("This invitation is not for you");
        }
        if (!"PENDING".equals(invite.getStatus())) {
            throw new BadRequestException("Invitation is not pending");
        }

        invite.setStatus("REJECTED");
        invitationRepository.save(invite);

        var itinerary = itineraryRepository.findById(invite.getItineraryId()).orElse(null);
        var inviter = userRepository.findById(invite.getInviterId()).orElse(null);
        return toInvitationResponse(invite,
                itinerary != null ? itinerary.getName() : "",
                inviter != null ? inviter.getNickname() : "");
    }

    // ── Remove collaborator ──

    @Transactional
    public void removeCollaborator(Long itineraryId, Long userId) {
        var user = getCurrentUser();
        var itinerary = itineraryRepository.findById(itineraryId)
                .orElseThrow(() -> new ResourceNotFoundException("Itinerary", itineraryId));

        // Only owner can remove
        if (!itinerary.getUserId().equals(user.getId())) {
            throw new BadRequestException("Only the owner can remove collaborators");
        }
        if (userId.equals(user.getId())) {
            throw new BadRequestException("You cannot remove yourself as owner");
        }

        var collab = collaboratorRepository.findByItineraryIdAndUserId(itineraryId, userId);
        if (collab.isEmpty()) {
            throw new ResourceNotFoundException("Collaborator not found", userId);
        }

        collaboratorRepository.deleteByItineraryIdAndUserId(itineraryId, userId);
    }

    // ── Queries ──

    public List<InvitationResponse> getPendingInvites(Long userId) {
        var invites = invitationRepository.findByInviteeIdAndStatus(userId, "PENDING");
        return invites.stream().map(inv -> {
            var itinerary = itineraryRepository.findById(inv.getItineraryId()).orElse(null);
            var inviter = userRepository.findById(inv.getInviterId()).orElse(null);
            return toInvitationResponse(inv,
                    itinerary != null ? itinerary.getName() : "(deleted)",
                    inviter != null ? inviter.getNickname() : "");
        }).toList();
    }

    public List<CollaboratorResponse> getCollaborators(Long itineraryId) {
        return collaboratorRepository.findByItineraryId(itineraryId).stream()
                .map(c -> {
                    var u = userRepository.findById(c.getUserId()).orElse(null);
                    return new CollaboratorResponse(c.getUserId(), c.getRole(),
                            u != null ? u.getNickname() : "");
                }).toList();
    }

    public boolean isCollaborator(Long itineraryId, Long userId) {
        return collaboratorRepository.existsByItineraryIdAndUserId(itineraryId, userId);
    }

    // ── Helpers ──

    private InvitationResponse toInvitationResponse(ItineraryInvitation inv, String name, String inviterName) {
        return new InvitationResponse(inv.getId(), inv.getItineraryId(), name,
                inv.getInviterId(), inviterName, inv.getStatus(), inv.getCreatedAt());
    }

    private User getCurrentUser() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
