package com.journeycraft.jc.auth.controller;

import com.journeycraft.jc.auth.dto.AuthResponse;
import com.journeycraft.jc.auth.dto.LoginRequest;
import com.journeycraft.jc.auth.dto.RegisterRequest;
import com.journeycraft.jc.auth.service.AuthService;
import com.journeycraft.jc.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        var result = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(result, "Registration successful"));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        var result = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success(result, "Login successful"));
    }
}
