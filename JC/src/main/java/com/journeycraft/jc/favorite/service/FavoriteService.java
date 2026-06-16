package com.journeycraft.jc.favorite.service;

import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.common.exception.BadRequestException;
import com.journeycraft.jc.common.exception.ResourceNotFoundException;
import com.journeycraft.jc.favorite.dto.*;
import com.journeycraft.jc.favorite.entity.Favorite;
import com.journeycraft.jc.favorite.repository.FavoriteRepository;
import com.journeycraft.jc.user.entity.User;
import com.journeycraft.jc.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor
public class FavoriteService {
    private final FavoriteRepository favoriteRepository;
    private final UserRepository userRepository;

    @Transactional
    public FavoriteResponse add(FavoriteRequest request) {
        var user = getCurrentUser();
        if (favoriteRepository.findByUserIdAndTypeAndTargetId(user.getId(), request.type(), request.targetId()).isPresent()) {
            throw new BadRequestException("Already favorited");
        }
        var fav = Favorite.builder().userId(user.getId()).type(request.type()).targetId(request.targetId()).targetName(request.targetName()).build();
        return FavoriteResponse.from(favoriteRepository.save(fav));
    }

    @Transactional(readOnly = true)
    public PageResponse<FavoriteResponse> list(String type, int page, int size) {
        var user = getCurrentUser();
        var p = type != null ? favoriteRepository.findByUserIdAndType(user.getId(), type, PageRequest.of(page, size))
                : favoriteRepository.findByUserId(user.getId(), PageRequest.of(page, size));
        return PageResponse.of(p.getContent().stream().map(FavoriteResponse::from).toList(), p.getNumber(), p.getSize(), p.getTotalElements());
    }

    @Transactional
    public void remove(String type, String targetId) {
        var user = getCurrentUser();
        favoriteRepository.deleteByUserIdAndTypeAndTargetId(user.getId(), type, targetId);
    }

    private User getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName()).orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
