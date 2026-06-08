package com.journeycraft.jc.user.dto;

import jakarta.validation.constraints.Size;

public record UserUpdateRequest(
        @Size(max = 100, message = "Nickname must be under 100 characters") String nickname,
        String avatar) {
}
