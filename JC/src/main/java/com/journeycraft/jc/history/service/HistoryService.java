package com.journeycraft.jc.history.service;

import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.common.exception.ResourceNotFoundException;
import com.journeycraft.jc.history.entity.*;
import com.journeycraft.jc.history.repository.*;
import com.journeycraft.jc.user.entity.User;
import com.journeycraft.jc.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor
public class HistoryService {
    private final SearchHistoryRepository searchRepo;
    private final BrowseHistoryRepository browseRepo;
    private final RouteHistoryRepository routeHistoryRepo;
    private final FacilityQueryHistoryRepository facilityQueryHistoryRepo;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public PageResponse<SearchHistory> getSearchHistory(int page, int size) {
        var user = getCurrentUser();
        var p = searchRepo.findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(page, size));
        return PageResponse.of(p.getContent(), p.getNumber(), p.getSize(), p.getTotalElements());
    }

    @Transactional(readOnly = true)
    public PageResponse<BrowseHistory> getBrowseHistory(String type, int page, int size) {
        var user = getCurrentUser();
        var p = type != null ? browseRepo.findByUserIdAndTypeOrderByCreatedAtDesc(user.getId(), type, PageRequest.of(page, size))
                : browseRepo.findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(page, size));
        return PageResponse.of(p.getContent(), p.getNumber(), p.getSize(), p.getTotalElements());
    }

    @Transactional
    public void recordSearch(String keyword, String type) {
        var user = getCurrentUser();
        searchRepo.save(SearchHistory.builder().userId(user.getId()).keyword(keyword).type(type).build());
    }

    @Transactional
    public void recordBrowse(String type, String targetId, String targetName) {
        var user = getCurrentUser();
        browseRepo.save(BrowseHistory.builder().userId(user.getId()).type(type).targetId(targetId).targetName(targetName).build());
    }

    @Transactional(readOnly = true)
    public PageResponse<RouteHistory> getRouteHistory(int page, int size) {
        var user = getCurrentUser();
        var p = routeHistoryRepo.findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(page, size));
        return PageResponse.of(p.getContent(), p.getNumber(), p.getSize(), p.getTotalElements());
    }

    @Transactional(readOnly = true)
    public PageResponse<FacilityQueryHistory> getFacilityQueryHistory(int page, int size) {
        var user = getCurrentUser();
        var p = facilityQueryHistoryRepo.findByUserIdOrderByCreatedAtDesc(user.getId(), PageRequest.of(page, size));
        return PageResponse.of(p.getContent(), p.getNumber(), p.getSize(), p.getTotalElements());
    }

    private User getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName()).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
