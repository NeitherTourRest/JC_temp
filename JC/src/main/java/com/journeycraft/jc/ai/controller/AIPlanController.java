package com.journeycraft.jc.ai.controller;

import com.journeycraft.jc.ai.service.AIPlanService;
import com.journeycraft.jc.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AIPlanController {

    private final AIPlanService planService;

    @PostMapping("/plan")
    public ResponseEntity<ApiResponse<AIPlanService.PlanResult>> generatePlan(
            @RequestBody AIPlanService.PlanRequest request) {
        if (request.days() < 1 || request.days() > 14) {
            return ResponseEntity.badRequest().body(ApiResponse.error("天数应在1-14天之间"));
        }
        return ResponseEntity.ok(ApiResponse.success(planService.generatePlan(request)));
    }
}
