package com.journeycraft.jc.recommend;

import com.journeycraft.jc.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/recommend")
@RequiredArgsConstructor
public class RecommendController {

    private final RecommendService recommendService;

    @GetMapping
    public ResponseEntity<ApiResponse<RecommendService.RecommendResult>> recommend(
            @RequestParam(required = false, defaultValue = "0") Long userId,
            @RequestParam(defaultValue = "6") int topK) {
        return ResponseEntity.ok(ApiResponse.success(recommendService.recommend(userId, topK)));
    }
}
