package com.journeycraft.jc.user.controller;

import com.journeycraft.jc.common.dto.ApiResponse;
import com.journeycraft.jc.user.dto.*;
import com.journeycraft.jc.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser() {
        return ResponseEntity.ok(ApiResponse.success(userService.getCurrentUser()));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> updateCurrentUser(
            @Valid @RequestBody UserUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(userService.updateCurrentUser(request)));
    }

    @GetMapping("/me/preferences")
    public ResponseEntity<ApiResponse<UserPreferenceResponse>> getPreferences() {
        return ResponseEntity.ok(ApiResponse.success(userService.getCurrentUserPreferences()));
    }

    @PutMapping("/me/preferences")
    public ResponseEntity<ApiResponse<UserPreferenceResponse>> updatePreferences(
            @RequestBody UserPreferenceUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success(userService.updateCurrentUserPreferences(request)));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<UserResponse>>> searchUsers(@RequestParam String keyword) {
        return ResponseEntity.ok(ApiResponse.success(userService.searchUsers(keyword)));
    }
}
