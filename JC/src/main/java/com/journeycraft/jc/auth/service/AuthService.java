package com.journeycraft.jc.auth.service;

import com.journeycraft.jc.auth.dto.AuthResponse;
import com.journeycraft.jc.auth.dto.LoginRequest;
import com.journeycraft.jc.auth.dto.RegisterRequest;
import com.journeycraft.jc.common.exception.BadRequestException;
import com.journeycraft.jc.common.util.JwtUtil;
import com.journeycraft.jc.user.entity.User;
import com.journeycraft.jc.user.entity.UserPreference;
import com.journeycraft.jc.user.repository.UserPreferenceRepository;
import com.journeycraft.jc.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final UserPreferenceRepository userPreferenceRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new BadRequestException("Username already exists");
        }
        if (request.email() != null && userRepository.existsByEmail(request.email())) {
            throw new BadRequestException("Email already exists");
        }

        var user = User.builder()
                .username(request.username())
                .password(passwordEncoder.encode(request.password()))
                .email(request.email())
                .nickname(request.nickname() != null ? request.nickname() : request.username())
                .build();

        user = userRepository.save(user);

        var preference = UserPreference.builder()
                .user(user)
                .travelMode("WALK")
                .build();
        userPreferenceRepository.save(preference);

        var accessToken = jwtUtil.generateAccessToken(user);
        var refreshToken = jwtUtil.generateRefreshToken(user);

        return new AuthResponse(accessToken, refreshToken, 900, user.getId(), user.getUsername(), user.getNickname());
    }

    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));

        var user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new BadRequestException("Invalid username or password"));

        var accessToken = jwtUtil.generateAccessToken(user);
        var refreshToken = jwtUtil.generateRefreshToken(user);

        return new AuthResponse(accessToken, refreshToken, 900, user.getId(), user.getUsername(), user.getNickname());
    }
}
