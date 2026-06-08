package com.journeycraft.jc.ai.controller;

import com.journeycraft.jc.ai.service.MiniMaxClient;
import com.journeycraft.jc.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/ai/generate")
@RequiredArgsConstructor
public class AIMiniMaxController {

    private final MiniMaxClient miniMaxClient;

    @PostMapping("/image")
    public ResponseEntity<ApiResponse<Map<String, Object>>> generateImage(@RequestBody Map<String, String> req) {
        if (!miniMaxClient.isAvailable()) {
            return ResponseEntity.ok(ApiResponse.error("MiniMax not configured. Set minimax.api.key in ai-api-key.properties"));
        }
        var result = miniMaxClient.generateImage(
                req.getOrDefault("prompt", ""),
                req.getOrDefault("aspect_ratio", "1:1")
        );
        if (result.success()) {
            return ResponseEntity.ok(ApiResponse.success(Map.of("imageUrl", result.imageUrl())));
        }
        return ResponseEntity.ok(ApiResponse.error(result.error()));
    }

    @PostMapping("/video")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createVideo(@RequestBody Map<String, String> req) {
        if (!miniMaxClient.isAvailable()) {
            return ResponseEntity.ok(ApiResponse.error("MiniMax not configured"));
        }
        var result = miniMaxClient.createVideoTask(req.getOrDefault("prompt", ""));
        if (result.success()) {
            return ResponseEntity.ok(ApiResponse.success(Map.of(
                    "taskId", result.taskId(),
                    "status", "Processing"
            )));
        }
        return ResponseEntity.ok(ApiResponse.error(result.status()));
    }

    @GetMapping("/video/query")
    public ResponseEntity<ApiResponse<Map<String, Object>>> queryVideo(@RequestParam String taskId) {
        var result = miniMaxClient.queryVideoTask(taskId);
        if (result.fileId() != null) {
            String downloadUrl = miniMaxClient.getVideoDownloadUrl(result.fileId());
            return ResponseEntity.ok(ApiResponse.success(Map.of(
                    "status", result.status(),
                    "fileId", result.fileId(),
                    "downloadUrl", downloadUrl != null ? downloadUrl : ""
            )));
        }
        return ResponseEntity.ok(ApiResponse.success(Map.of("status", result.status())));
    }

    @PostMapping("/music")
    public ResponseEntity<ApiResponse<Map<String, Object>>> generateMusic(@RequestBody Map<String, Object> req) {
        if (!miniMaxClient.isAvailable()) {
            return ResponseEntity.ok(ApiResponse.error("MiniMax not configured"));
        }
        String prompt = (String) req.getOrDefault("prompt", "");
        String lyrics = (String) req.getOrDefault("lyrics", "");
        boolean instrumental = Boolean.TRUE.equals(req.get("instrumental"));
        var result = miniMaxClient.generateMusic(prompt, lyrics, instrumental);
        if (result.success()) {
            return ResponseEntity.ok(ApiResponse.success(Map.of("audioUrl", result.audioUrl())));
        }
        return ResponseEntity.ok(ApiResponse.error(result.error()));
    }
}