package com.journeycraft.jc.archeckin;

import com.journeycraft.jc.common.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/v1/ar-checkin")
public class ARCheckinController {

    private static final Map<Long, List<Map<String, Object>>> PHOTO_SPOTS = Map.of(
        1L, List.of(
            Map.of("name", "神道最佳拍摄点", "lat", 40.254, "lng", 116.219, "description", "捕捉神道石象生的完美角度", "angle", "东南45°"),
            Map.of("name", "长陵全景", "lat", 40.251, "lng", 116.217, "description", "俯瞰整个长陵建筑群", "angle", "正北"),
            Map.of("name", "定陵地宫入口", "lat", 40.255, "lng", 116.220, "description", "地宫入口光影交错", "angle", "正东")
        ),
        2L, List.of(
            Map.of("name", "云台拍摄点", "lat", 40.290, "lng", 116.067, "description", "云台石刻细节", "angle", "正南"),
            Map.of("name", "长城全景", "lat", 40.288, "lng", 116.069, "description", "长城蜿蜒如龙", "angle", "西北45°")
        ),
        3L, List.of(
            Map.of("name", "山顶观景台", "lat", 40.266, "lng", 116.274, "description", "俯瞰昌平城区", "angle", "正南"),
            Map.of("name", "天池倒影", "lat", 40.264, "lng", 116.276, "description", "天池水面倒影拍摄", "angle", "正西")
        )
    );

    @GetMapping("/spots/{spotId}/photo-spots")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPhotoSpots(@PathVariable Long spotId) {
        return ResponseEntity.ok(ApiResponse.success(
                PHOTO_SPOTS.getOrDefault(spotId, List.of(
                    Map.of("name", "推荐拍摄点", "lat", 40.2, "lng", 116.3, "description", "景点拍摄位置", "angle", "正北")
                ))));
    }

    @PostMapping("/checkin")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkin(@RequestBody Map<String, Object> body) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", "success");
        result.put("spotId", body.getOrDefault("spotId", 0));
        result.put("photoName", body.getOrDefault("photoName", "未知"));
        result.put("timestamp", java.time.LocalDateTime.now().toString());
        result.put("badge", "📸 打卡成功！");
        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
