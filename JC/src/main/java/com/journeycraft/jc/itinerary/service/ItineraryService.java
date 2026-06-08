package com.journeycraft.jc.itinerary.service;

import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.common.exception.ResourceNotFoundException;
import com.journeycraft.jc.itinerary.dto.*;
import com.journeycraft.jc.itinerary.entity.Itinerary;
import com.journeycraft.jc.itinerary.repository.ItineraryRepository;
import com.journeycraft.jc.user.entity.User;
import com.journeycraft.jc.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ItineraryService {

    private final ItineraryRepository itineraryRepository;
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
    public PageResponse<ItineraryResponse> list(int page, int size) {
        var user = getCurrentUser();
        var p = itineraryRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(page, size));
        return PageResponse.of(p.getContent().stream().map(ItineraryResponse::from).toList(),
                p.getNumber(), p.getSize(), p.getTotalElements());
    }

    @Transactional(readOnly = true)
    public ItineraryResponse get(Long id) {
        return ItineraryResponse.from(itineraryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Itinerary", id)));
    }

    @Transactional
    public ItineraryResponse update(Long id, ItineraryRequest request) {
        var it = itineraryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Itinerary", id));
        it.setName(request.name());
        it.setRouteData(request.routeData());
        it.setSpotIds(request.spotIds());
        it.setTotalDistance(request.totalDistance());
        it.setTotalTime(request.totalTime());
        return ItineraryResponse.from(itineraryRepository.save(it));
    }

    @Transactional
    public void delete(Long id) {
        itineraryRepository.deleteById(id);
    }

    private User getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
