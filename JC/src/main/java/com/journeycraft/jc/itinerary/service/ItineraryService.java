package com.journeycraft.jc.itinerary.service;

import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.common.exception.BadRequestException;
import com.journeycraft.jc.common.exception.ResourceNotFoundException;
import com.journeycraft.jc.itinerary.dto.*;
import com.journeycraft.jc.itinerary.entity.Itinerary;
import com.journeycraft.jc.itinerary.repository.ItineraryCollaboratorRepository;
import com.journeycraft.jc.itinerary.repository.ItineraryRepository;
import com.journeycraft.jc.user.entity.User;
import com.journeycraft.jc.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class ItineraryService {

    private final ItineraryRepository itineraryRepository;
    private final ItineraryCollaboratorRepository collaboratorRepository;
    private final UserRepository userRepository;

    @Transactional
    public ItineraryResponse create(ItineraryRequest request) {
        var user = getCurrentUser();
        var it = Itinerary.builder()
                .userId(user.getId()).name(request.name())
                .routeData(request.routeData()).spotIds(request.spotIds())
                .totalDistance(request.totalDistance()).totalTime(request.totalTime())
                .build();
        return ItineraryResponse.from(itineraryRepository.save(it));
    }

    @Transactional(readOnly = true)
    public PageResponse<ItineraryResponse> list(int page, int size, String keyword) {
        var user = getCurrentUser();
        var pageable = PageRequest.of(page, size);

        // Get own itineraries
        Page<Itinerary> ownPage;
        if (keyword != null && !keyword.isBlank()) {
            ownPage = itineraryRepository.searchByUserIdAndKeyword(user.getId(), keyword, pageable);
        } else {
            ownPage = itineraryRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable);
        }

        // Get shared itineraries (where user is a collaborator)
        var collabs = collaboratorRepository.findByUserId(user.getId());
        var sharedIds = collabs.stream().map(c -> c.getItineraryId()).toList();
        List<Itinerary> shared = sharedIds.isEmpty() ? List.of() :
                itineraryRepository.findAllById(sharedIds);

        // Combine: own first, then shared, sorted by createdAt desc
        var combined = new ArrayList<>(ownPage.getContent());
        for (var s : shared) {
            if (combined.stream().noneMatch(i -> i.getId().equals(s.getId()))) {
                combined.add(s);
            }
        }
        combined.sort(Comparator.comparing(Itinerary::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));

        var content = combined.stream().map(it -> {
            String myRole = it.getUserId().equals(user.getId()) ? "owner" : "editor";
            var collabsList = collaboratorRepository.findByItineraryId(it.getId()).stream()
                    .map(c -> {
                        var u = userRepository.findById(c.getUserId()).orElse(null);
                        return new CollaboratorResponse(c.getUserId(), c.getRole(),
                                u != null ? u.getNickname() : "");
                    }).toList();
            return ItineraryResponse.from(it, myRole, collabsList);
        }).toList();

        return PageResponse.of(content, page, size, (long) content.size());
    }

    @Transactional(readOnly = true)
    public ItineraryResponse get(Long id) {
        var it = itineraryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Itinerary", id));
        var user = getCurrentUser();
        String myRole = it.getUserId().equals(user.getId()) ? "owner" : "viewer";
        var collab = collaboratorRepository.findByItineraryIdAndUserId(id, user.getId());
        if (collab.isPresent()) myRole = collab.get().getRole();

        var collabsList = collaboratorRepository.findByItineraryId(it.getId()).stream()
                .map(c -> {
                    var u = userRepository.findById(c.getUserId()).orElse(null);
                    return new CollaboratorResponse(c.getUserId(), c.getRole(),
                            u != null ? u.getNickname() : "");
                }).toList();

        return ItineraryResponse.from(it, myRole, collabsList);
    }

    @Transactional
    public ItineraryResponse update(Long id, ItineraryRequest request) {
        var it = itineraryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Itinerary", id));

        // Version conflict detection
        if (request.version() != null && !request.version().equals(it.getVersion())) {
            throw new BadRequestException("Version conflict: itinerary has been modified. Latest version: " + it.getVersion());
        }

        it.setName(request.name());
        it.setRouteData(request.routeData());
        it.setSpotIds(request.spotIds());
        it.setTotalDistance(request.totalDistance());
        it.setTotalTime(request.totalTime());
        it.setVersion(it.getVersion() + 1);

        var saved = itineraryRepository.save(it);
        var user = getCurrentUser();
        String myRole = saved.getUserId().equals(user.getId()) ? "owner" : "editor";

        var collabsList = collaboratorRepository.findByItineraryId(saved.getId()).stream()
                .map(c -> {
                    var u = userRepository.findById(c.getUserId()).orElse(null);
                    return new CollaboratorResponse(c.getUserId(), c.getRole(),
                            u != null ? u.getNickname() : "");
                }).toList();

        return ItineraryResponse.from(saved, myRole, collabsList);
    }

    @Transactional
    public void delete(Long id) {
        var user = getCurrentUser();
        var it = itineraryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Itinerary", id));
        if (!it.getUserId().equals(user.getId())) {
            throw new BadRequestException("Only the owner can delete an itinerary");
        }
        itineraryRepository.deleteById(id);
    }

    private User getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
