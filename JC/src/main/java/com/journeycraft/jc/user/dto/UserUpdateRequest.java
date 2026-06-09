package com.journeycraft.jc.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record UserUpdateRequest(
        @Size(min = 2, max = 50, message = "Username must be 2-50 characters")
        String username,

        @Size(max = 100, message = "Nickname must be under 100 characters")
        String nickname,

        @Email(message = "Invalid email format")
        String email,

        String avatar) {
}
