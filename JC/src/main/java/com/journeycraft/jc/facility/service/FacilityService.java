package com.journeycraft.jc.facility.service;

import com.journeycraft.jc.facility.dto.FacilityResponse;
import com.journeycraft.jc.facility.repository.FacilityRepository;
import com.journeycraft.jc.navigation.algorithm.DijkstraAlgorithm;
import com.journeycraft.jc.navigation.graph.Graph;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service @RequiredArgsConstructor
public class FacilityService {
    private final FacilityRepository facilityRepository;
    private final Graph navigationGraph;

    @Transactional(readOnly = true)
    public List<FacilityResponse> getNearbyFacilities(double lat, double lng, String category, double range) {
        var facilities = category != null
                ? facilityRepository.findByCategory(category)
                : facilityRepository.findNearby(lat, lng, range * 1000);

        var userNode = navigationGraph.findNearestNode(lat, lng);

        return facilities.stream().map(f -> {
            double dist;
            var facNode = navigationGraph.findNearestNode(f.getLatitude(), f.getLongitude());
            if (userNode != null && facNode != null) {
                // Use actual path distance for sorting
                var pathResult = DijkstraAlgorithm.findShortestPath(
                        navigationGraph, userNode.getNodeId(), facNode.getNodeId(), "DISTANCE", 40.0, "WALK");
                if (pathResult.isReachable()) {
                    dist = pathResult.totalDistance();
                } else {
                    dist = Graph.haversineDistance(lat, lng, f.getLatitude(), f.getLongitude());
                }
            } else {
                dist = Graph.haversineDistance(lat, lng, f.getLatitude(), f.getLongitude());
            }
            if (dist <= range * 1000) return FacilityResponse.from(f, dist);
            return null;
        }).filter(r -> r != null).sorted(Comparator.comparingDouble(FacilityResponse::distance)).toList();
    }
}
