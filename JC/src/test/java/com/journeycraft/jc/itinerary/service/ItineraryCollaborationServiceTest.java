package com.journeycraft.jc.itinerary.service;

import com.journeycraft.jc.common.exception.BadRequestException;
import com.journeycraft.jc.common.exception.ResourceNotFoundException;
import com.journeycraft.jc.itinerary.entity.Itinerary;
import com.journeycraft.jc.itinerary.entity.ItineraryCollaborator;
import com.journeycraft.jc.itinerary.entity.ItineraryInvitation;
import com.journeycraft.jc.itinerary.repository.ItineraryCollaboratorRepository;
import com.journeycraft.jc.itinerary.repository.ItineraryInvitationRepository;
import com.journeycraft.jc.itinerary.repository.ItineraryRepository;
import com.journeycraft.jc.user.entity.User;
import com.journeycraft.jc.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("CollaborationService — invite, accept, reject, remove")
class ItineraryCollaborationServiceTest {

    @Mock private ItineraryRepository itineraryRepository;
    @Mock private ItineraryCollaboratorRepository collaboratorRepository;
    @Mock private ItineraryInvitationRepository invitationRepository;
    @Mock private UserRepository userRepository;
    @Mock private SecurityContext securityContext;
    @Mock private Authentication authentication;

    private ItineraryCollaborationService collaborationService;

    private User owner, invitee;
    private Itinerary itinerary;

    @BeforeEach
    void setUp() {
        collaborationService = new ItineraryCollaborationService(
                itineraryRepository, collaboratorRepository, invitationRepository, userRepository);

        owner = User.builder().id(1L).username("owner").nickname("Owner").build();
        invitee = User.builder().id(2L).username("invitee").nickname("Invitee").build();
        itinerary = Itinerary.builder().id(10L).userId(1L).name("Test Trip").version(1).build();
    }

    private void mockAuthUser(User user) {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn(user.getUsername());
        SecurityContextHolder.setContext(securityContext);
        when(userRepository.findByUsername(user.getUsername())).thenReturn(Optional.of(user));
    }

    // ── invite ──

    @Test
    @DisplayName("invite creates PENDING invitation")
    void invite() {
        mockAuthUser(owner);
        when(itineraryRepository.findById(10L)).thenReturn(Optional.of(itinerary));
        when(userRepository.findById(2L)).thenReturn(Optional.of(invitee));
        when(collaboratorRepository.existsByItineraryIdAndUserId(10L, 2L)).thenReturn(false);
        when(invitationRepository.findByItineraryIdAndInviteeId(10L, 2L)).thenReturn(Optional.empty());
        when(invitationRepository.save(any(ItineraryInvitation.class)))
                .thenAnswer(i -> i.getArgument(0));

        var result = collaborationService.invite(10L, 2L);

        assertNotNull(result);
        assertEquals(10L, result.itineraryId());
        assertEquals("PENDING", result.status());
        verify(invitationRepository).save(any(ItineraryInvitation.class));
    }

    @Test
    @DisplayName("invite by non-owner without editor role throws")
    void inviteWithoutPermission() {
        User otherUser = User.builder().id(3L).username("other").build();
        mockAuthUser(otherUser);
        when(itineraryRepository.findById(10L)).thenReturn(Optional.of(itinerary));
        when(collaboratorRepository.findByItineraryIdAndUserId(10L, 3L)).thenReturn(Optional.empty());

        assertThrows(BadRequestException.class, () -> collaborationService.invite(10L, 2L));
    }

    @Test
    @DisplayName("invite non-existent user throws")
    void inviteNonExistentUser() {
        mockAuthUser(owner);
        when(itineraryRepository.findById(10L)).thenReturn(Optional.of(itinerary));
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> collaborationService.invite(10L, 99L));
    }

    @Test
    @DisplayName("invite self throws")
    void inviteSelf() {
        mockAuthUser(owner);
        when(itineraryRepository.findById(10L)).thenReturn(Optional.of(itinerary));

        assertThrows(BadRequestException.class, () -> collaborationService.invite(10L, 1L));
    }

    @Test
    @DisplayName("invite existing collaborator throws")
    void inviteExistingCollaborator() {
        mockAuthUser(owner);
        when(itineraryRepository.findById(10L)).thenReturn(Optional.of(itinerary));
        when(userRepository.findById(2L)).thenReturn(Optional.of(invitee));
        when(collaboratorRepository.existsByItineraryIdAndUserId(10L, 2L)).thenReturn(true);

        assertThrows(BadRequestException.class, () -> collaborationService.invite(10L, 2L));
    }

    @Test
    @DisplayName("invite when pending invitation exists throws")
    void inviteDuplicatePending() {
        mockAuthUser(owner);
        when(itineraryRepository.findById(10L)).thenReturn(Optional.of(itinerary));
        when(userRepository.findById(2L)).thenReturn(Optional.of(invitee));
        when(collaboratorRepository.existsByItineraryIdAndUserId(10L, 2L)).thenReturn(false);
        when(invitationRepository.findByItineraryIdAndInviteeId(10L, 2L))
                .thenReturn(Optional.of(ItineraryInvitation.builder().status("PENDING").build()));

        assertThrows(BadRequestException.class, () -> collaborationService.invite(10L, 2L));
    }

    // ── accept ──

    @Test
    @DisplayName("accept creates collaborator with role=editor")
    void accept() {
        var invite = ItineraryInvitation.builder().id(5L).itineraryId(10L)
                .inviterId(1L).inviteeId(2L).status("PENDING").build();
        mockAuthUser(invitee);
        when(invitationRepository.findById(5L)).thenReturn(Optional.of(invite));
        when(collaboratorRepository.save(any(ItineraryCollaborator.class)))
                .thenAnswer(i -> i.getArgument(0));
        when(invitationRepository.save(any(ItineraryInvitation.class)))
                .thenAnswer(i -> i.getArgument(0));

        var result = collaborationService.accept(5L);

        assertEquals("ACCEPTED", result.status());
        verify(collaboratorRepository).save(argThat(c ->
                c.getItineraryId().equals(10L) && c.getUserId().equals(2L) && "editor".equals(c.getRole())
        ));
    }

    @Test
    @DisplayName("accept non-existent invite throws")
    void acceptNotFound() {
        mockAuthUser(invitee);
        when(invitationRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> collaborationService.accept(99L));
    }

    @Test
    @DisplayName("accept by wrong user throws")
    void acceptWrongUser() {
        User wrongUser = User.builder().id(3L).username("wrong").build();
        var invite = ItineraryInvitation.builder().id(5L).inviteeId(2L).status("PENDING").build();
        mockAuthUser(wrongUser);
        when(invitationRepository.findById(5L)).thenReturn(Optional.of(invite));

        assertThrows(BadRequestException.class, () -> collaborationService.accept(5L));
    }

    @Test
    @DisplayName("reject sets status to REJECTED")
    void reject() {
        var invite = ItineraryInvitation.builder().id(5L).itineraryId(10L)
                .inviterId(1L).inviteeId(2L).status("PENDING").build();
        mockAuthUser(invitee);
        when(invitationRepository.findById(5L)).thenReturn(Optional.of(invite));
        when(invitationRepository.save(any(ItineraryInvitation.class)))
                .thenAnswer(i -> i.getArgument(0));

        var result = collaborationService.reject(5L);
        assertEquals("REJECTED", result.status());
    }

    // ── remove collaborator ──

    @Test
    @DisplayName("owner can remove editor")
    void removeCollaborator() {
        mockAuthUser(owner);
        when(itineraryRepository.findById(10L)).thenReturn(Optional.of(itinerary));
        when(collaboratorRepository.findByItineraryIdAndUserId(10L, 1L))
                .thenReturn(Optional.of(ItineraryCollaborator.builder().role("owner").build()));
        when(collaboratorRepository.findByItineraryIdAndUserId(10L, 2L))
                .thenReturn(Optional.of(ItineraryCollaborator.builder().role("editor").build()));

        collaborationService.removeCollaborator(10L, 2L);

        verify(collaboratorRepository).deleteByItineraryIdAndUserId(10L, 2L);
    }

    @Test
    @DisplayName("non-owner cannot remove collaborator")
    void removeCollaboratorWithoutPermission() {
        User otherUser = User.builder().id(3L).username("other").build();
        mockAuthUser(otherUser);
        when(itineraryRepository.findById(10L)).thenReturn(Optional.of(itinerary));
        when(collaboratorRepository.findByItineraryIdAndUserId(10L, 3L)).thenReturn(Optional.empty());

        assertThrows(BadRequestException.class, () -> collaborationService.removeCollaborator(10L, 2L));
    }

    @Test
    @DisplayName("owner cannot remove self")
    void removeSelf() {
        mockAuthUser(owner);
        when(itineraryRepository.findById(10L)).thenReturn(Optional.of(itinerary));
        when(collaboratorRepository.findByItineraryIdAndUserId(10L, 1L))
                .thenReturn(Optional.of(ItineraryCollaborator.builder().role("owner").build()));

        assertThrows(BadRequestException.class, () -> collaborationService.removeCollaborator(10L, 1L));
    }

    // ── getPendingInvites ──

    @Test
    @DisplayName("getPendingInvites returns pending invites for user")
    void getPendingInvites() {
        mockAuthUser(invitee);
        var invite = ItineraryInvitation.builder().id(5L).itineraryId(10L)
                .inviterId(1L).inviteeId(2L).status("PENDING").build();
        when(invitationRepository.findByInviteeIdAndStatus(2L, "PENDING")).thenReturn(List.of(invite));
        when(itineraryRepository.findById(10L)).thenReturn(Optional.of(itinerary));
        when(userRepository.findById(1L)).thenReturn(Optional.of(owner));

        var results = collaborationService.getPendingInvites(2L);

        assertEquals(1, results.size());
        assertEquals("Test Trip", results.get(0).itineraryName());
        assertEquals("Owner", results.get(0).inviterName());
    }
}
