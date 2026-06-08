package com.journeycraft.jc.congestion;

import com.journeycraft.jc.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController @RequestMapping("/api/v1/congestion") @RequiredArgsConstructor
public class ReverseTourController {
    private final CongestionService congestionService;

    /**
     * Suggest less-crowded alternative areas near a congested spot.
     */
    @GetMapping("/reverse-suggest/{areaId}")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> reverseSuggest(@PathVariable String areaId) {
        var current = congestionService.getArea(areaId);
        if (current == null) return ResponseEntity.ok(ApiResponse.success(List.of()));

        // If current area is not congested, no suggestion needed
        if ("LOW".equals(current.level)) {
            return ResponseEntity.ok(ApiResponse.success(List.of()));
        }

        // Find LOW-crowded areas sorted by proximity to current area
        var allAreas = congestionService.getAllAreas();
        List<Map<String, Object>> suggestions = new ArrayList<>();
        for (var entry : allAreas.entrySet()) {
            var area = entry.getValue();
            if ("LOW".equals(area.level) && !entry.getKey().equals(areaId)) {
                double dist = Math.sqrt(
                    Math.pow(area.lat - current.lat, 2) + Math.pow(area.lng - current.lng, 2));
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("areaId", entry.getKey()); m.put("name", area.name);
                m.put("distance", Math.round(dist * 111000.0) / 1000.0); // rough km
                m.put("lat", area.lat); m.put("lng", area.lng);
                suggestions.add(m);
            }
        }
        suggestions.sort(Comparator.comparingDouble(m -> (Double) m.get("distance")));
        return ResponseEntity.ok(ApiResponse.success(suggestions));
    }
}
