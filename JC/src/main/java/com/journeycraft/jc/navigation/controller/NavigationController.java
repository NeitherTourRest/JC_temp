package com.journeycraft.jc.navigation.controller;

import com.journeycraft.jc.common.dto.ApiResponse;
import com.journeycraft.jc.navigation.dto.RouteRequest;
import com.journeycraft.jc.navigation.dto.RouteResponse;
import com.journeycraft.jc.navigation.service.NavigationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/navigation")
@RequiredArgsConstructor
public class NavigationController {

    private final NavigationService navigationService;

    @PostMapping("/route")
    public ResponseEntity<ApiResponse<RouteResponse>> planRoute(
            @Valid @RequestBody RouteRequest request) {
        return ResponseEntity.ok(ApiResponse.success(navigationService.planRoute(request)));
    }
}
