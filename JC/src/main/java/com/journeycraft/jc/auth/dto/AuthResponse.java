package com.journeycraft.jc.auth.dto;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        long expiresIn,
        Long userId,
        String username,
        String nickname) {
}
