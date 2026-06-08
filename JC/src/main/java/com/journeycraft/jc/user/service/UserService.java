package com.journeycraft.jc.user.service;

import com.journeycraft.jc.common.exception.ResourceNotFoundException;
import com.journeycraft.jc.user.dto.*;
import com.journeycraft.jc.user.entity.User;
import com.journeycraft.jc.user.repository.UserPreferenceRepository;
import com.journeycraft.jc.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserPreferenceRepository userPreferenceRepository;

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser() {
        var user = getCurrentUserEntity();
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateCurrentUser(UserUpdateRequest request) {
        var user = getCurrentUserEntity();
        if (request.nickname() != null) {
            user.setNickname(request.nickname());
        }
        if (request.avatar() != null) {
            user.setAvatar(request.avatar());
        }
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public UserPreferenceResponse getCurrentUserPreferences() {
        var user = getCurrentUserEntity();
        var pref = userPreferenceRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("UserPreference not found for user", user.getId()));
        return UserPreferenceResponse.from(pref);
    }

    @Transactional
    public UserPreferenceResponse updateCurrentUserPreferences(UserPreferenceUpdateRequest request) {
        var user = getCurrentUserEntity();
        var pref = userPreferenceRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("UserPreference not found for user", user.getId()));

        if (request.interestCategories() != null) {
            pref.setInterestCategories(request.interestCategories());
        }
        if (request.cuisinePreferences() != null) {
            pref.setCuisinePreferences(request.cuisinePreferences());
        }
        if (request.travelMode() != null) {
            pref.setTravelMode(request.travelMode());
        }

        return UserPreferenceResponse.from(userPreferenceRepository.save(pref));
    }

    private User getCurrentUserEntity() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        var username = auth.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found", username));
    }
}
