package com.journeycraft.jc.diary.controller;

import com.journeycraft.jc.common.dto.ApiResponse;
import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.diary.dto.*;
import com.journeycraft.jc.diary.service.DiaryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/diaries")
@RequiredArgsConstructor
public class DiaryController {

    private final DiaryService diaryService;

    @PostMapping
    public ResponseEntity<ApiResponse<DiaryResponse>> createDiary(
            @Valid @RequestBody DiaryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(diaryService.createDiary(request)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<DiaryResponse>>> listDiaries(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "popularity") String sortBy,
            @RequestParam(required = false) String destination) {
        return ResponseEntity.ok(ApiResponse.success(
                diaryService.listDiaries(page, size, sortBy, destination)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DiaryResponse>> getDiary(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(diaryService.getDiary(id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DiaryResponse>> updateDiary(
            @PathVariable String id, @Valid @RequestBody DiaryRequest request) {
        return ResponseEntity.ok(ApiResponse.success(diaryService.updateDiary(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDiary(@PathVariable String id) {
        diaryService.deleteDiary(id);
        return ResponseEntity.ok(ApiResponse.success(null, "Diary deleted"));
    }

    @PostMapping("/{id}/rate")
    public ResponseEntity<ApiResponse<DiaryResponse>> rateDiary(
            @PathVariable String id, @RequestParam int rating) {
        return ResponseEntity.ok(ApiResponse.success(diaryService.rateDiary(id, rating)));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<PageResponse<DiaryResponse>>> searchDiaries(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                diaryService.searchDiaries(keyword, page, size)));
    }

    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<PageResponse<DiaryResponse>>> getMyDiaries(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                diaryService.getMyDiaries(page, size)));
    }
}
