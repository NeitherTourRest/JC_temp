package com.journeycraft.jc.indoor.controller;

import com.journeycraft.jc.common.dto.ApiResponse;
import com.journeycraft.jc.indoor.service.IndoorNavigationService;
import com.journeycraft.jc.indoor.service.IndoorNavigationService.NavigationResult;
import com.journeycraft.jc.indoor.service.IndoorNavigationService.BuildingMetadata;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/indoor")
@RequiredArgsConstructor
public class IndoorNavigationController {
    
    private final IndoorNavigationService navigationService;
    private final MongoTemplate mongoTemplate;
    
    @GetMapping("/debug/mongo")
    public ResponseEntity<ApiResponse<Map<String, Object>>> debugMongo() {
        try {
            long count = mongoTemplate.getCollection("indoor_navigation").countDocuments();
            var doc = mongoTemplate.findOne(new Query(Criteria.where("buildingId").is("BUPT_ZHONGHE_ZONGHE")), 
                org.bson.Document.class, "indoor_navigation");
            return ResponseEntity.ok(ApiResponse.success(Map.of(
                "count", count,
                "found", doc != null,
                "collection", mongoTemplate.getCollectionName(com.journeycraft.jc.indoor.document.IndoorBuilding.class),
                "db", mongoTemplate.getDb().getName()
            )));
        } catch (Exception e) {
            return ResponseEntity.ok(ApiResponse.error(e.getMessage()));
        }
    }
    
    @GetMapping("/navigate")
    public ResponseEntity<ApiResponse<NavigationResult>> navigate(
            @RequestParam String buildingId,
            @RequestParam String from,
            @RequestParam String to) {
        
        NavigationResult result = navigationService.findPath(buildingId, from, to);
        
        if (result.success) {
            return ResponseEntity.ok(ApiResponse.success(result));
        } else {
            return ResponseEntity.ok(ApiResponse.error(result.error));
        }
    }
    
    @GetMapping("/building")
    public ResponseEntity<ApiResponse<BuildingMetadata>> getBuilding(@RequestParam String buildingId) {
        BuildingMetadata meta = navigationService.getBuildingMetadata(buildingId);
        if (meta == null) {
            return ResponseEntity.ok(ApiResponse.error("Building not found"));
        }
        return ResponseEntity.ok(ApiResponse.success(meta));
    }
}
