package com.journeycraft.jc.navigation.algorithm;

import com.journeycraft.jc.navigation.graph.Graph;
import com.journeycraft.jc.navigation.graph.GraphNode;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Self-designed TSP (Traveling Salesman Problem) solver for multi-destination route planning.
 * 
 * Algorithm: Greedy initial solution + 2-opt local optimization.
 * - Greedy: Start from origin, always go to the nearest unvisited target.
 * - 2-opt: Swap two edges and check if the total distance improves.
 * 
 * Complexity: O(n²) for greedy, O(n²) per 2-opt iteration.
 * Suitable for n ≤ 20 targets (typical tourism use case).
 */
public class TSPAlgorithm {

    private TSPAlgorithm() {}

    public record TSPResult(
            List<GraphNode> orderedNodes,
            List<String> orderedNodeIds,
            double totalDistance,
            Map<String, DijkstraAlgorithm.PathResult> segmentPaths
    ) {}

    /**
     * Compute optimal visiting order for multiple destinations, starting from origin.
     *
     * @param graph The navigation graph
     * @param originNodeId Starting node ID
     * @param targetNodeIds List of target node IDs to visit
     * @param strategy "DISTANCE" or "TIME"
     * @param transportSpeedKmh max transport speed in km/h
     * @param finalDestinationIdx index within targetNodeIds that is the final stop;
     *                            -1 or >= targetNodeIds.size() means return to origin
     * @return TSPResult with optimal ordering
     */
    public static TSPResult solve(Graph graph, String originNodeId, List<String> targetNodeIds,
                                   String strategy, double transportSpeedKmh, int finalDestinationIdx) {
        if (targetNodeIds == null || targetNodeIds.isEmpty()) {
            var originNode = graph.getNode(originNodeId);
            return new TSPResult(
                    originNode != null ? List.of(originNode) : List.of(),
                    List.of(originNodeId),
                    0, Collections.emptyMap());
        }

        // Step 1: Compute all-pairs shortest paths between all nodes (origin + targets)
        Set<String> allNodes = new LinkedHashSet<>();
        allNodes.add(originNodeId);
        allNodes.addAll(targetNodeIds);
        List<String> nodeList = new ArrayList<>(allNodes);

        // Distance matrix
        int n = nodeList.size();
        double[][] distMatrix = new double[n][n];
        Map<String, Map<String, DijkstraAlgorithm.PathResult>> pathCache = new HashMap<>();

        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                if (i == j) {
                    distMatrix[i][j] = 0;
                    continue;
                }
                var result = DijkstraAlgorithm.findShortestPath(graph, nodeList.get(i), nodeList.get(j), strategy, transportSpeedKmh);
                if (result.isReachable()) {
                    double weight = "TIME".equalsIgnoreCase(strategy) ? result.totalTime() : result.totalDistance();
                    distMatrix[i][j] = weight;
                    pathCache.computeIfAbsent(nodeList.get(i), k -> new HashMap<>())
                            .put(nodeList.get(j), result);
                } else {
                    distMatrix[i][j] = Double.MAX_VALUE;
                }
            }
        }

        // Step 2: Greedy initial solution
        int originIdx = 0; // originNodeId is first in the list
        boolean returnToOrigin = finalDestinationIdx < 0 || finalDestinationIdx >= targetNodeIds.size();
        List<Integer> greedyOrder = greedyTSP(distMatrix, n, originIdx, returnToOrigin);

        // Step 3: 2-opt local optimization
        List<Integer> optimizedOrder = twoOpt(distMatrix, greedyOrder);

        // Step 4: Build result
        List<GraphNode> orderedNodes = new ArrayList<>();
        List<String> orderedNodeIds = new ArrayList<>();
        Map<String, DijkstraAlgorithm.PathResult> segmentPaths = new LinkedHashMap<>();
        double totalDist = 0;

        for (int i = 0; i < optimizedOrder.size(); i++) {
            int idx = optimizedOrder.get(i);
            String nodeId = nodeList.get(idx);
            var node = graph.getNode(nodeId);
            if (node != null) orderedNodes.add(node);
            orderedNodeIds.add(nodeId);

            if (i > 0) {
                int prevIdx = optimizedOrder.get(i - 1);
                String fromId = nodeList.get(prevIdx);
                String toId = nodeId;
                var path = pathCache.getOrDefault(fromId, Collections.emptyMap()).get(toId);
                if (path != null) {
                    segmentPaths.put(fromId + "->" + toId, path);
                    totalDist += "TIME".equalsIgnoreCase(strategy) ? path.totalTime() : path.totalDistance();
                }
            }
        }

        return new TSPResult(orderedNodes, orderedNodeIds, totalDist, segmentPaths);
    }

    /** Backward-compatible: always return to origin */
    public static TSPResult solve(Graph graph, String originNodeId, List<String> targetNodeIds,
                                   String strategy, double transportSpeedKmh) {
        return solve(graph, originNodeId, targetNodeIds, strategy, transportSpeedKmh, -1);
    }

    /** Backward-compatible overload without transport speed */
    public static TSPResult solve(Graph graph, String originNodeId, List<String> targetNodeIds, String strategy) {
        return solve(graph, originNodeId, targetNodeIds, strategy, 40.0, -1);
    }

    /**
     * Greedy TSP: always visit the nearest unvisited node.
     * @param returnToOrigin if false, ends at the last visited target instead of returning to start
     */
    private static List<Integer> greedyTSP(double[][] distMatrix, int n, int startIdx, boolean returnToOrigin) {
        List<Integer> order = new ArrayList<>();
        boolean[] visited = new boolean[n];
        
        int current = startIdx;
        order.add(current);
        visited[current] = true;

        for (int k = 1; k < n; k++) {
            double minDist = Double.MAX_VALUE;
            int next = -1;
            for (int j = 0; j < n; j++) {
                if (!visited[j] && distMatrix[current][j] < minDist) {
                    minDist = distMatrix[current][j];
                    next = j;
                }
            }
            if (next == -1) break;
            order.add(next);
            visited[next] = true;
            current = next;
        }

        // Return to start (only if returnToOrigin is true)
        if (returnToOrigin) {
            order.add(startIdx);
        }

        return order;
    }

    /**
     * 2-opt local optimization: repeatedly swap two edges if it improves the tour.
     * When returnToOrigin is false, the last node is fixed (not swapped).
     */
    private static List<Integer> twoOpt(double[][] distMatrix, List<Integer> tour) {
        List<Integer> best = new ArrayList<>(tour);
        boolean improved = true;
        int maxIterations = 100;

        while (improved && maxIterations-- > 0) {
            improved = false;
            // Don't try to swap the first/last elements (they're the origin)
            for (int i = 1; i < best.size() - 2; i++) {
                for (int j = i + 1; j < best.size() - 1; j++) {
                    if (j - i == 1) continue; // Adjacent edges

                    List<Integer> newTour = twoOptSwap(best, i, j);
                    double oldDist = tourDistance(distMatrix, best);
                    double newDist = tourDistance(distMatrix, newTour);

                    if (newDist < oldDist - 0.001) {
                        best = newTour;
                        improved = true;
                    }
                }
            }
        }

        return best;
    }

    /**
     * Perform a 2-opt swap: reverse the segment between i and j.
     */
    private static List<Integer> twoOptSwap(List<Integer> tour, int i, int j) {
        List<Integer> newTour = new ArrayList<>();
        // Add nodes up to i (inclusive)
        for (int k = 0; k <= i; k++) {
            newTour.add(tour.get(k));
        }
        // Add reversed segment from j down to i+1
        for (int k = j; k > i; k--) {
            newTour.add(tour.get(k));
        }
        // Add remaining nodes after j
        for (int k = j + 1; k < tour.size(); k++) {
            newTour.add(tour.get(k));
        }
        return newTour;
    }

    /**
     * Compute total tour distance.
     */
    private static double tourDistance(double[][] distMatrix, List<Integer> tour) {
        double total = 0;
        for (int i = 0; i < tour.size() - 1; i++) {
            total += distMatrix[tour.get(i)][tour.get(i + 1)];
        }
        return total;
    }
}
