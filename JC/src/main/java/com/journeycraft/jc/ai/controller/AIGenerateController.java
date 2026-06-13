package com.journeycraft.jc.ai.controller;

import com.journeycraft.jc.ai.service.DiaryGenerationService;
import com.journeycraft.jc.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AIGenerateController {

    private final DiaryGenerationService generationService;

    @PostMapping("/generate/diary")
    public ResponseEntity<ApiResponse<DiaryGenerationService.GenerateResult>> generateDiary(
            @RequestBody DiaryGenerationService.GenerateRequest request) {
        if ((request.prompt() == null || request.prompt().isBlank()) && request.itineraryId() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("请提供提示词或选择行程"));
        }
        String text = generationService.generate(request.prompt(), request.itineraryId());
        return ResponseEntity.ok(ApiResponse.success(new DiaryGenerationService.GenerateResult(text)));
    }
}
