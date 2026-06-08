package com.journeycraft.jc.link.controller;

import com.journeycraft.jc.common.dto.ApiResponse;
import com.journeycraft.jc.link.entity.TravelServiceLink;
import com.journeycraft.jc.link.service.LinkService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor
public class LinkController {
    private final LinkService linkService;

    @GetMapping("/spots/{spotId}/links")
    public ResponseEntity<ApiResponse<List<TravelServiceLink>>> getLinks(@PathVariable Long spotId) {
        return ResponseEntity.ok(ApiResponse.success(linkService.getLinksBySpot(spotId)));
    }
}
