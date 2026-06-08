package com.journeycraft.jc.collaboration;

import com.journeycraft.jc.common.dto.ApiResponse;
import com.journeycraft.jc.spot.dto.SpotResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/v1/collaboration") @RequiredArgsConstructor
public class CollaborationController {
    private final CollaborationService collaborationService;

    /**
     * Collaborative recommendation for a group.
     * Merges preferences from multiple users and returns compromise-ranked spots.
     */
    @GetMapping("/recommend")
    public ResponseEntity<ApiResponse<List<SpotResponse>>> collaborativeRecommend(
            @RequestParam List<Long> userIds, @RequestParam(defaultValue = "5") int topK) {
        return ResponseEntity.ok(ApiResponse.success(
                collaborationService.collaborativeRecommend(userIds, topK)));
    }
}
