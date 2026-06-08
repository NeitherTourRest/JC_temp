package com.journeycraft.jc.ai.controller;

import com.journeycraft.jc.ai.service.DiarySummaryService;
import com.journeycraft.jc.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AISummaryController {

    private final DiarySummaryService summaryService;

    @GetMapping("/summary/diary/{diaryId}")
    public ResponseEntity<ApiResponse<DiarySummaryService.SummaryResult>> summarizeDiary(
            @PathVariable String diaryId) {
        return ResponseEntity.ok(ApiResponse.success(summaryService.summarizeDiary(diaryId)));
    }

    @GetMapping("/summary/latest")
    public ResponseEntity<ApiResponse<DiarySummaryService.SummaryResult>> summarizeLatest() {
        return ResponseEntity.ok(ApiResponse.success(summaryService.summarizeLatest()));
    }
}
