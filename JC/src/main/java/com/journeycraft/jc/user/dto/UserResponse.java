package com.journeycraft.jc.user.dto;

import com.journeycraft.jc.user.entity.User;

import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String username,
        String email,
        String nickname,
        String avatar,
        LocalDateTime createdAt,
        String token) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getNickname(),
                user.getAvatar(),
                user.getCreatedAt(),
                null);
    }

    public static UserResponse withToken(User user, String token) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getNickname(),
                user.getAvatar(),
                user.getCreatedAt(),
                token);
    }
}
