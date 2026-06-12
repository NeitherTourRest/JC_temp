package com.journeycraft.jc.itinerary.controller;

import com.journeycraft.jc.common.dto.ApiResponse;
import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.itinerary.dto.*;
import com.journeycraft.jc.itinerary.service.ItineraryCollaborationService;
import com.journeycraft.jc.itinerary.service.ItineraryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/itineraries")
@RequiredArgsConstructor
public class ItineraryController {

    private final ItineraryService itineraryService;
    private final ItineraryCollaborationService collaborationService;

    @PostMapping
    public ResponseEntity<ApiResponse<ItineraryResponse>> create(@Valid @RequestBody ItineraryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(itineraryService.create(request)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ItineraryResponse>>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(ApiResponse.success(itineraryService.list(page, size, keyword)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ItineraryResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(itineraryService.get(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ItineraryResponse>> update(@PathVariable Long id, @Valid @RequestBody ItineraryRequest request) {
        return ResponseEntity.ok(ApiResponse.success(itineraryService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        itineraryService.delete(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Itinerary deleted"));
    }

    // ── Collaboration endpoints ──

    @PostMapping("/{id}/invite")
    public ResponseEntity<ApiResponse<InvitationResponse>> invite(
            @PathVariable Long id, @RequestBody InviteRequest request) {
        return ResponseEntity.ok(ApiResponse.success(collaborationService.invite(id, request.inviteeId())));
    }

    @PostMapping("/invitations/{invitationId}/accept")
    public ResponseEntity<ApiResponse<InvitationResponse>> accept(@PathVariable Long invitationId) {
        return ResponseEntity.ok(ApiResponse.success(collaborationService.accept(invitationId)));
    }

    @PostMapping("/invitations/{invitationId}/reject")
    public ResponseEntity<ApiResponse<InvitationResponse>> reject(@PathVariable Long invitationId) {
        return ResponseEntity.ok(ApiResponse.success(collaborationService.reject(invitationId)));
    }

    @GetMapping("/invitations/pending")
    public ResponseEntity<ApiResponse<List<InvitationResponse>>> pendingInvites(
            @RequestParam Long userId) {
        return ResponseEntity.ok(ApiResponse.success(collaborationService.getPendingInvites(userId)));
    }

    @DeleteMapping("/{id}/collaborators/{userId}")
    public ResponseEntity<ApiResponse<Void>> removeCollaborator(
            @PathVariable Long id, @PathVariable Long userId) {
        collaborationService.removeCollaborator(id, userId);
        return ResponseEntity.ok(ApiResponse.success(null, "Collaborator removed"));
    }
}
