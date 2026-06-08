package com.journeycraft.jc.search.controller;

import com.journeycraft.jc.common.dto.ApiResponse;
import com.journeycraft.jc.search.dto.SearchResult;
import com.journeycraft.jc.search.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    public ResponseEntity<ApiResponse<SearchResult>> search(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "5") int limit) {
        return ResponseEntity.ok(ApiResponse.success(searchService.searchAll(keyword, limit)));
    }
}
