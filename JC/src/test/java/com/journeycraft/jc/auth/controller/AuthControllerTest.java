package com.journeycraft.jc.auth.controller;

import com.journeycraft.jc.auth.dto.AuthResponse;
import com.journeycraft.jc.auth.dto.LoginRequest;
import com.journeycraft.jc.auth.dto.RegisterRequest;
import com.journeycraft.jc.auth.service.AuthService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthController — register and login endpoints")
class AuthControllerTest {

    @Mock private AuthService authService;
    @InjectMocks private AuthController controller;

    @Test
    @DisplayName("register returns 201 with ApiResponse")
    void register() {
        when(authService.register(any(RegisterRequest.class)))
                .thenReturn(new AuthResponse("access-token", "rtoken", 900, 1L, "testuser", "Test"));

        var request = new RegisterRequest("testuser", "password123", "test@test.com", "Test");
        var response = controller.register(request);
        var body = response.getBody();

        assertEquals(201, response.getStatusCode().value());
        assertNotNull(body);
        assertTrue(body.success());
        assertEquals("access-token", body.data().accessToken());
    }

    @Test
    @DisplayName("login returns 200 with tokens")
    void login() {
        when(authService.login(any(LoginRequest.class)))
                .thenReturn(new AuthResponse("access-token", "refresh-token", 900, 1L, "testuser", "Test"));

        var request = new LoginRequest("testuser", "password123");
        var response = controller.login(request);
        var body = response.getBody();

        assertNotNull(body);
        assertTrue(body.success());
        assertEquals("access-token", body.data().accessToken());
        assertEquals("refresh-token", body.data().refreshToken());
    }
}
