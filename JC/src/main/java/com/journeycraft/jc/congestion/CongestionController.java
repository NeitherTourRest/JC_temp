package com.journeycraft.jc.congestion;

import com.journeycraft.jc.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController @RequestMapping("/api/v1/congestion") @RequiredArgsConstructor
public class CongestionController {
    private final CongestionService congestionService;

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCongestionStatus() {
        var areas = congestionService.getAllAreas();
        Map<String, Object> result = new LinkedHashMap<>();
        for (var entry : areas.entrySet()) {
            var area = entry.getValue();
            Map<String, Object> info = new LinkedHashMap<>();
            info.put("name", area.name);
            info.put("lat", area.lat);
            info.put("lng", area.lng);
            info.put("level", area.level);
            result.put(entry.getKey(), info);
        }
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/status/{areaId}")
    public ResponseEntity<ApiResponse<CongestionService.CongestionArea>> getAreaStatus(@PathVariable String areaId) {
        return ResponseEntity.ok(ApiResponse.success(congestionService.getArea(areaId)));
    }
}
