package com.journeycraft.jc.ai.controller;

import com.journeycraft.jc.ai.service.AIBudgetService;
import com.journeycraft.jc.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AIBudgetController {

    private final AIBudgetService budgetService;

    @PostMapping("/budget")
    public ResponseEntity<ApiResponse<AIBudgetService.BudgetResult>> estimateBudget(
            @RequestBody AIBudgetService.BudgetRequest request) {
        if (request.days() < 1 || request.peopleCount() < 1) {
            return ResponseEntity.badRequest().body(ApiResponse.error("天数和人数必须大于0"));
        }
        return ResponseEntity.ok(ApiResponse.success(budgetService.estimateBudget(request)));
    }
}
