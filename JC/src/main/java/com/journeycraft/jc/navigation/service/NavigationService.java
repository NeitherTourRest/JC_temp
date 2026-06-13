package com.journeycraft.jc.navigation.service;

import com.journeycraft.jc.navigation.algorithm.DijkstraAlgorithm;
import com.journeycraft.jc.navigation.algorithm.TSPAlgorithm;
import com.journeycraft.jc.navigation.dto.RouteRequest;
import com.journeycraft.jc.navigation.dto.RouteResponse;
import com.journeycraft.jc.navigation.graph.Graph;
import com.journeycraft.jc.navigation.graph.GraphNode;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NavigationService {

    private static final Logger log = LoggerFactory.getLogger(NavigationService.class);
    private final Graph navigationGraph;

    /**
     * Plan a route from start to one or more targets.
     * For single target: Dijkstra. For multiple targets: TSP.
     * Supports multi-transport: tries each transport mode and picks the fastest.
     */
    public RouteResponse planRoute(RouteRequest request) {
        var startNode = navigationGraph.findNearestNode(request.startLat(), request.startLng());
        if (startNode == null) {
            log.warn("No graph node found near start location");
            return emptyResponse();
        }

        var strategy = request.strategy() != null ? request.strategy() : "DISTANCE";
        var transports = request.transports() != null ? request.transports() : List.of("WALK");

        if (request.targets().size() == 1) {
            return planSingleTarget(startNode, request.targets().get(0), strategy, transports);
        } else {
            return planMultiTarget(startNode, request.targets(), strategy, transports, request.finalDestinationIdx());
        }
    }

    /**
     * Map transport name to max speed in km/h.
     */
    private static double transportSpeed(String transport) {
        return switch (transport.toUpperCase()) {
            case "WALK" -> 5.0;
            case "BIKE" -> 15.0;
            case "SHUTTLE", "ELECTRIC" -> 30.0;
            default -> 40.0;
        };
    }

    private RouteResponse planSingleTarget(GraphNode startNode, RouteRequest.TargetPoint target,
                                            String strategy, List<String> transports) {
        var targetNode = navigationGraph.findNearestNode(target.lat(), target.lng());
        if (targetNode == null) return emptyResponse();

        // For DISTANCE strategy, transport doesn't matter; for single transport, use it directly
        if (!"TIME".equalsIgnoreCase(strategy) || transports.size() == 1) {
            String transport = transports.get(0);
            double speed = transportSpeed(transport);
            return buildSingleResponse(startNode, targetNode, strategy, speed, transport);
        }

        // For TIME strategy with multiple transports: try each, pick fastest
        RouteResponse best = null;
        double bestTime = Double.MAX_VALUE;
        for (String t : transports) {
            double speed = transportSpeed(t);
            var resp = buildSingleResponse(startNode, targetNode, strategy, speed, t);
            if (resp.totalTime() > 0 && resp.totalTime() < bestTime) {
                bestTime = resp.totalTime();
                best = resp;
            }
        }
        return best != null ? best : emptyResponse();
    }

    private RouteResponse buildSingleResponse(GraphNode startNode, GraphNode targetNode,
                                               String strategy, double transportSpeed,
                                               String transport) {
        // Check if in same connected component (OSM graph has many disconnected sub-graphs)
        if (!navigationGraph.isSameComponent(startNode.getNodeId(), targetNode.getNodeId())) {
            log.warn("Start and target are in different connected components. Using route + walking bridge.");
            return buildBridgedResponse(startNode, targetNode, strategy, transportSpeed, transport);
        }

        var result = DijkstraAlgorithm.findShortestPath(
                navigationGraph, startNode.getNodeId(), targetNode.getNodeId(),
                strategy, transportSpeed, transport);
        if (!result.isReachable()) return emptyResponse();

        return buildWaypointResponse(result, startNode, targetNode, strategy);
    }

    /**
     * Build a route between two disconnected components by finding a walking bridge.
     */
    private RouteResponse buildBridgedResponse(GraphNode startNode, GraphNode targetNode,
                                                String strategy, double transportSpeed,
                                                String transport) {
        int startComp = startNode.getComponentId();
        int targetComp = targetNode.getComponentId();

        // Find the nearest node in the target component to the starting component
        // This is the "bridge" - a straight-line walking segment between components
        GraphNode bestBridgeFrom = null;
        GraphNode bestBridgeTo = null;
        double bestBridgeDist = Double.MAX_VALUE;

        for (var candidate : navigationGraph.getNodes()) {
            if (candidate.getComponentId() == startComp) {
                // Find nearest node in targetComp to this candidate
                // (simplified: iterate all nodes in targetComp)
                for (var target : navigationGraph.getNodes()) {
                    if (target.getComponentId() == targetComp) {
                        double d = Graph.haversineDistance(
                                candidate.getLatitude(), candidate.getLongitude(),
                                target.getLatitude(), target.getLongitude());
                        if (d < bestBridgeDist) {
                            bestBridgeDist = d;
                            bestBridgeFrom = candidate;
                            bestBridgeTo = target;
                        }
                    }
                }
            }
        }

        if (bestBridgeFrom == null || bestBridgeTo == null) return emptyResponse();

        // Route: start → bridgeFrom (within component)
        var leg1 = DijkstraAlgorithm.findShortestPath(
                navigationGraph, startNode.getNodeId(), bestBridgeFrom.getNodeId(),
                strategy, transportSpeed, transport);
        // Route: bridgeTo → target (within target component)
        var leg2 = DijkstraAlgorithm.findShortestPath(
                navigationGraph, bestBridgeTo.getNodeId(), targetNode.getNodeId(),
                strategy, transportSpeed, transport);

        List<RouteResponse.Waypoint> allWaypoints = new ArrayList<>();
        List<String> allNodeIds = new ArrayList<>();

        if (leg1.isReachable()) {
            for (var node : leg1.path()) {
                allWaypoints.add(new RouteResponse.Waypoint(
                        node.getNodeId(), node.getLatitude(), node.getLongitude(),
                        node.getName(), false));
                allNodeIds.add(node.getNodeId());
            }
        }

        // Add bridge segment as a waypoint (walking between components)
        double bridgeDist = Graph.haversineDistance(
                bestBridgeFrom.getLatitude(), bestBridgeFrom.getLongitude(),
                bestBridgeTo.getLatitude(), bestBridgeTo.getLongitude());
        allWaypoints.add(new RouteResponse.Waypoint(
                "bridge_" + startComp + "_" + targetComp,
                (bestBridgeFrom.getLatitude() + bestBridgeTo.getLatitude()) / 2,
                (bestBridgeFrom.getLongitude() + bestBridgeTo.getLongitude()) / 2,
                "步行过渡段", true));
        allNodeIds.add("bridge");

        if (leg2.isReachable()) {
            for (var node : leg2.path()) {
                allWaypoints.add(new RouteResponse.Waypoint(
                        node.getNodeId(), node.getLatitude(), node.getLongitude(),
                        node.getName(), node.getNodeId().equals(targetNode.getNodeId())));
                allNodeIds.add(node.getNodeId());
            }
        }

        double totalDist = (leg1.isReachable() ? leg1.totalDistance() : 0) + bridgeDist + (leg2.isReachable() ? leg2.totalDistance() : 0);
        List<RouteResponse.RouteSegment> allSegments = new ArrayList<>();
        if (leg1.isReachable()) {
            leg1.segments().forEach(ps -> allSegments.add(new RouteResponse.RouteSegment(
                    ps.fromNodeId(), ps.toNodeId(), ps.distance(), ps.time(),
                    ps.roadName(), ps.roadType(), ps.transport())));
        }
        allSegments.add(new RouteResponse.RouteSegment(
                "bridge_" + startComp + "_" + targetComp, "bridge_end",
                bridgeDist, bridgeDist / (transportSpeed * 1000 / 3600),
                "步行过渡段", "walking_bridge", transport));
        if (leg2.isReachable()) {
            leg2.segments().forEach(ps -> allSegments.add(new RouteResponse.RouteSegment(
                    ps.fromNodeId(), ps.toNodeId(), ps.distance(), ps.time(),
                    ps.roadName(), ps.roadType(), ps.transport())));
        }
        return new RouteResponse(allWaypoints, totalDist, totalDist / (transportSpeed * 1000 / 3600),
                strategy, allNodeIds, allSegments);
    }

    private RouteResponse buildWaypointResponse(DijkstraAlgorithm.PathResult result,
                                                  GraphNode startNode, GraphNode targetNode, String strategy) {
        List<RouteResponse.Waypoint> waypoints = new ArrayList<>();
        for (var node : result.path()) {
            boolean isTarget = node.getNodeId().equals(targetNode.getNodeId())
                    || node.getNodeId().equals(startNode.getNodeId());
            waypoints.add(new RouteResponse.Waypoint(
                    node.getNodeId(), node.getLatitude(), node.getLongitude(),
                    node.getName(), isTarget));
        }
        var segments = result.segments().stream()
                .map(ps -> new RouteResponse.RouteSegment(
                        ps.fromNodeId(), ps.toNodeId(),
                        ps.distance(), ps.time(),
                        ps.roadName(), ps.roadType(), ps.transport()))
                .toList();
        return new RouteResponse(waypoints, result.totalDistance(), result.totalTime(),
                strategy, result.nodeIds(), segments);
    }

    private RouteResponse planMultiTarget(GraphNode startNode, List<RouteRequest.TargetPoint> targets,
                                           String strategy, List<String> transports, Integer finalDestinationIdx) {
        List<String> targetNodeIds = new ArrayList<>();
        for (var target : targets) {
            var node = navigationGraph.findNearestNode(target.lat(), target.lng());
            if (node != null) targetNodeIds.add(node.getNodeId());
        }

        String transport = transports.get(0);
        double speed = transportSpeed(transport);
        var tspResult = TSPAlgorithm.solve(
                navigationGraph, startNode.getNodeId(), targetNodeIds, strategy, speed,
                finalDestinationIdx != null ? finalDestinationIdx : -1, transport);

        // 将每段的完整OSM路网路径拼接到一起，形成连续的path
        List<RouteResponse.Waypoint> waypoints = new ArrayList<>();
        List<String> allNodeIds = new ArrayList<>();
        var orderedIds = tspResult.orderedNodeIds();
        var segmentPaths = tspResult.segmentPaths();

        for (int i = 0; i < orderedIds.size() - 1; i++) {
            String fromId = orderedIds.get(i);
            String toId = orderedIds.get(i + 1);
            String key = fromId + "->" + toId;

            var pathResult = segmentPaths.get(key);
            if (pathResult != null && pathResult.isReachable()) {
                List<String> segNodeIds = pathResult.nodeIds();
                for (int j = 0; j < segNodeIds.size(); j++) {
                    String nodeId = segNodeIds.get(j);
                    // 跳过前一段的最后一个节点（避免重复）
                    if (j == 0 && !allNodeIds.isEmpty()
                            && allNodeIds.get(allNodeIds.size() - 1).equals(nodeId)) {
                        continue;
                    }
                    var node = navigationGraph.getNode(nodeId);
                    if (node != null) {
                        boolean isTarget = nodeId.equals(toId)
                                || (i == 0 && j == 0); // start is start point
                        waypoints.add(new RouteResponse.Waypoint(
                                node.getNodeId(), node.getLatitude(), node.getLongitude(),
                                node.getName(), isTarget));
                        allNodeIds.add(nodeId);
                    }
                }
            } else {
                // Fallback: 如果该段不可达，直接插入目标点
                var node = navigationGraph.getNode(toId);
                if (node != null) {
                    waypoints.add(new RouteResponse.Waypoint(
                            node.getNodeId(), node.getLatitude(), node.getLongitude(),
                            node.getName(), true));
                    allNodeIds.add(toId);
                }
            }
        }

        // Collect segments from the TSP segment paths
        List<RouteResponse.RouteSegment> allSegments = new ArrayList<>();
        for (int i = 0; i < orderedIds.size() - 1; i++) {
            String fromId = orderedIds.get(i);
            String toId = orderedIds.get(i + 1);
            String key = fromId + "->" + toId;
            var pathResult = segmentPaths.get(key);
            if (pathResult != null && pathResult.isReachable()) {
                for (var ps : pathResult.segments()) {
                    allSegments.add(new RouteResponse.RouteSegment(
                            ps.fromNodeId(), ps.toNodeId(), ps.distance(), ps.time(),
                            ps.roadName(), ps.roadType(), ps.transport()));
                }
            }
        }

        return new RouteResponse(waypoints, tspResult.totalDistance(),
                tspResult.totalDistance() / (speed * 1000 / 3600),
                strategy, allNodeIds, allSegments);
    }

    private RouteResponse emptyResponse() {
        return new RouteResponse(List.of(), 0, 0, "DISTANCE", List.of(), List.of());
    }
}
