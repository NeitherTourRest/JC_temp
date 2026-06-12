package com.journeycraft.jc.user.service;

import com.journeycraft.jc.common.exception.BadRequestException;
import com.journeycraft.jc.common.exception.ResourceNotFoundException;
import com.journeycraft.jc.common.util.JwtUtil;
import com.journeycraft.jc.user.dto.*;
import com.journeycraft.jc.user.entity.User;
import com.journeycraft.jc.user.repository.UserPreferenceRepository;
import com.journeycraft.jc.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    private final JwtUtil jwtUtil;

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser() {
        var user = getCurrentUserEntity();
        return UserResponse.from(user);
    }

    @Transactional
    public UserResponse updateCurrentUser(UserUpdateRequest request) {
        var user = getCurrentUserEntity();
        boolean usernameChanged = false;

        if (request.username() != null && !request.username().isBlank()) {
            // Check if username is taken by another user
            if (!request.username().equals(user.getUsername()) &&
                    userRepository.existsByUsername(request.username())) {
                throw new BadRequestException("Username already taken");
            }
            if (!request.username().equals(user.getUsername())) {
                usernameChanged = true;
            }
            user.setUsername(request.username());
        }

        if (request.nickname() != null) {
            user.setNickname(request.nickname());
        }

        if (request.email() != null && !request.email().isBlank()) {
            // Check if email is taken by another user
            if (!request.email().equals(user.getEmail()) &&
                    userRepository.existsByEmail(request.email())) {
                throw new BadRequestException("Email already in use");
            }
            user.setEmail(request.email());
        }

        if (request.avatar() != null) {
            user.setAvatar(request.avatar());
        }

        user = userRepository.save(user);

        // If username changed, the old JWT is invalid — generate a new one
        if (usernameChanged) {
            var newToken = jwtUtil.generateAccessToken(user);
            return UserResponse.withToken(user, newToken);
        }

        return UserResponse.from(user);
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

    @Transactional(readOnly = true)
    public List<UserResponse> searchUsers(String keyword) {
        return userRepository.searchByKeyword(keyword).stream()
                .map(UserResponse::from)
                .toList();
    }

    private User getCurrentUserEntity() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        var username = auth.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found", username));
    }
}
