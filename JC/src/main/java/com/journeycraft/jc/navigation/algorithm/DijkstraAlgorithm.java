package com.journeycraft.jc.navigation.algorithm;

import com.journeycraft.jc.navigation.graph.Graph;
import com.journeycraft.jc.navigation.graph.GraphEdge;
import com.journeycraft.jc.navigation.graph.GraphNode;

import java.util.*;

/**
 * Self-designed Dijkstra's shortest path algorithm.
 * Uses a priority queue (binary min-heap) for O((V+E) log V) complexity.
 * Supports dual-weight strategy: DISTANCE (shortest physical distance) and TIME (shortest travel time).
 */
public class DijkstraAlgorithm {

    private DijkstraAlgorithm() {}

    /**
     * Result of a pathfinding operation.
     */
    public record PathResult(
            List<GraphNode> path,
            double totalDistance,
            double totalTime,
            List<String> nodeIds,
            List<PathSegment> segments
    ) {
        public boolean isReachable() {
            return path != null && !path.isEmpty();
        }
    }

    /**
     * A segment of the computed path.
     */
    public record PathSegment(
            String fromNodeId, String toNodeId,
            double distance, double time, String roadName, String roadType,
            String transport
    ) {}

    /**
     * Compute shortest path from start to end using the specified strategy and transport mode.
     * @param graph The navigation graph
     * @param startId Start node ID
     * @param endId End node ID
     * @param strategy "DISTANCE" or "TIME"
     * @param transportSpeedKmh max speed in km/h for the transport (for TIME strategy)
     * @param transport transport mode string ("WALK", "BIKE", "SHUTTLE") or null for no filtering
     * @return PathResult with path details
     */
    public static PathResult findShortestPath(Graph graph, String startId, String endId, 
                                               String strategy, double transportSpeedKmh,
                                               String transport) {
        GraphNode startNode = graph.getNode(startId);
        GraphNode endNode = graph.getNode(endId);

        if (startNode == null || endNode == null) {
            return new PathResult(Collections.emptyList(), 0, 0, Collections.emptyList(), Collections.emptyList());
        }

        graph.resetNodes();
        startNode.setDistance(0);

        PriorityQueue<GraphNode> pq = new PriorityQueue<>();
        pq.offer(startNode);

        while (!pq.isEmpty()) {
            GraphNode current = pq.poll();

            if (current.isVisited()) continue;
            current.setVisited(true);

            // Early termination: found the target
            if (current.equals(endNode)) break;

            // Relax outgoing edges, filtering by transport mode
            for (GraphEdge edge : graph.getEdges(current.getNodeId())) {
                if (transport != null && !edge.isAllowedForTransport(transport)) continue;
                GraphNode neighbor = graph.getNode(edge.getToNodeId());
                if (neighbor == null) continue;

                double weight = edge.getWeight(strategy, transportSpeedKmh);
                double newDist = current.getDistance() + weight;

                if (newDist < neighbor.getDistance()) {
                    neighbor.setDistance(newDist);
                    neighbor.setPrevious(current);
                    pq.offer(neighbor);
                }
            }
        }

        return buildPathResult(endNode, startNode, endNode, strategy, graph, transport);
    }

    /** Overload with transport mode but default null (no filtering). */
    public static PathResult findShortestPath(Graph graph, String startId, String endId, 
                                               String strategy, double transportSpeedKmh) {
        return findShortestPath(graph, startId, endId, strategy, transportSpeedKmh, null);
    }

    /** Backward-compatible overload without transport speed (uses default 40 km/h). */
    public static PathResult findShortestPath(Graph graph, String startId, String endId, String strategy) {
        return findShortestPath(graph, startId, endId, strategy, 40.0, null);
    }

    /**
     * Compute distances from start to all reachable nodes.
     * @return Map of nodeId -> distance
     */
    public static Map<String, Double> computeAllDistances(Graph graph, String startId, String strategy) {
        GraphNode startNode = graph.getNode(startId);
        if (startNode == null) return Collections.emptyMap();

        graph.resetNodes();
        startNode.setDistance(0);

        PriorityQueue<GraphNode> pq = new PriorityQueue<>();
        pq.offer(startNode);

        while (!pq.isEmpty()) {
            GraphNode current = pq.poll();
            if (current.isVisited()) continue;
            current.setVisited(true);

            for (GraphEdge edge : graph.getEdges(current.getNodeId())) {
                GraphNode neighbor = graph.getNode(edge.getToNodeId());
                if (neighbor == null) continue;

                double weight = edge.getWeight(strategy, 40.0);
                double newDist = current.getDistance() + weight;

                if (newDist < neighbor.getDistance()) {
                    neighbor.setDistance(newDist);
                    neighbor.setPrevious(current);
                    pq.offer(neighbor);
                }
            }
        }

        Map<String, Double> distances = new HashMap<>();
        for (GraphNode node : graph.getNodes()) {
            if (node.isVisited()) {
                distances.put(node.getNodeId(), node.getDistance());
            }
        }
        return distances;
    }

    private static PathResult buildPathResult(GraphNode endNode, GraphNode startNode, GraphNode endNodeOrig,
                                               String strategy, Graph graph) {
        return buildPathResult(endNode, startNode, endNodeOrig, strategy, graph, null);
    }

    private static PathResult buildPathResult(GraphNode endNode, GraphNode startNode, GraphNode endNodeOrig,
                                               String strategy, Graph graph, String transport) {
        if (endNode.getPrevious() == null && !endNode.equals(startNode)) {
            return new PathResult(Collections.emptyList(), 0, 0, Collections.emptyList(), Collections.emptyList());
        }

        List<GraphNode> path = new ArrayList<>();
        List<String> nodeIds = new ArrayList<>();
        GraphNode current = endNode;

        while (current != null) {
            path.add(current);
            nodeIds.add(current.getNodeId());
            current = current.getPrevious();
        }
        Collections.reverse(path);
        Collections.reverse(nodeIds);

        // Build segments with real road info and transport mode
        List<PathSegment> segments = new ArrayList<>();
        double totalDistance = 0;
        double totalTime = 0;

        for (int i = 0; i < path.size() - 1; i++) {
            GraphNode from = path.get(i);
            GraphNode to = path.get(i + 1);
            
            // Look up edge metadata from graph
            String roadName = "";
            String roadType = "";
            for (GraphEdge edge : graph.getEdges(from.getNodeId())) {
                if (edge.getToNodeId().equals(to.getNodeId())) {
                    roadName = edge.getName() != null ? edge.getName() : "";
                    roadType = edge.getRoadType() != null ? edge.getRoadType() : "";
                    double edgeDist = edge.getDistance();
                    totalDistance += edgeDist;
                    segments.add(new PathSegment(from.getNodeId(), to.getNodeId(), edgeDist, 0,
                            roadName, roadType, transport));
                    break;
                }
            }
        }

        totalTime = endNode.getDistance();

        return new PathResult(path, totalDistance, totalTime, nodeIds, segments);
    }
}
