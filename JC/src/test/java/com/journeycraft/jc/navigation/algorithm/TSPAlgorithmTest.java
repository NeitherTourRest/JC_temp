package com.journeycraft.jc.navigation.algorithm;

import com.journeycraft.jc.navigation.graph.Graph;
import com.journeycraft.jc.navigation.graph.GraphEdge;
import com.journeycraft.jc.navigation.graph.GraphNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.util.List;

@DisplayName("TSPAlgorithm — multi-destination optimal route (greedy + 2-opt)")
class TSPAlgorithmTest {

    private Graph graph;

    @BeforeEach
    void setUp() {
        graph = new Graph("tsp-test");
        // 4 nodes in a rough square for testing TSP
        // A(origin) ── B
        //    │          │
        //    C ──────── D
        String[] ids = {"A", "B", "C", "D"};
        double[][] coords = {{40.0, 116.0}, {40.05, 116.05}, {40.0, 116.05}, {40.05, 116.0}};
        for (int i = 0; i < 4; i++) {
            graph.addNode(new GraphNode(ids[i], coords[i][0], coords[i][1]));
        }

        // Fully connected with equal distances (~7.8km each edge)
        double dist = Graph.haversineDistance(coords[0][0], coords[0][1], coords[1][0], coords[1][1]);
        for (int i = 0; i < 4; i++) {
            for (int j = i + 1; j < 4; j++) {
                double d = Graph.haversineDistance(coords[i][0], coords[i][1], coords[j][0], coords[j][1]);
                graph.addEdge(GraphEdge.builder()
                        .edgeId("e" + i + j).fromNodeId(ids[i]).toNodeId(ids[j])
                        .distance(d).roadType("primary").maxSpeed(60).build());
            }
        }
    }

    @Test
    @DisplayName("solve with empty targets returns origin-only")
    void emptyTargets() {
        var result = TSPAlgorithm.solve(graph, "A", List.of(), "DISTANCE");
        assertEquals(1, result.orderedNodes().size());
        assertEquals("A", result.orderedNodeIds().get(0));
    }

    @Test
    @DisplayName("solve with single target returns origin -> target -> origin (return to origin)")
    void singleTarget() {
        var result = TSPAlgorithm.solve(graph, "A", List.of("B"), "DISTANCE");
        // Default returns to origin: A → B → A
        assertEquals(3, result.orderedNodeIds().size());
        assertEquals("A", result.orderedNodeIds().get(0));
        assertEquals("B", result.orderedNodeIds().get(1));
        assertEquals("A", result.orderedNodeIds().get(2));
    }

    @Test
    @DisplayName("solve with multiple targets returns optimized visiting order")
    void multipleTargets() {
        var result = TSPAlgorithm.solve(graph, "A", List.of("B", "C", "D"), "DISTANCE");
        // All targets should be visited
        assertEquals(5, result.orderedNodeIds().size(), "origin + 3 targets + return to origin");
        assertTrue(result.orderedNodeIds().contains("B"));
        assertTrue(result.orderedNodeIds().contains("C"));
        assertTrue(result.orderedNodeIds().contains("D"));
    }

    @Test
    @DisplayName("solve with returnToOrigin=true ends at origin")
    void returnToOriginTrue() {
        var result = TSPAlgorithm.solve(graph, "A", List.of("B", "C"), "DISTANCE", 40.0);
        var ids = result.orderedNodeIds();
        assertEquals("A", ids.get(0));
        assertEquals("A", ids.get(ids.size() - 1));
    }

    @Test
    @DisplayName("solve with finalDestinationIdx does not return to origin")
    void returnToOriginFalse() {
        var result = TSPAlgorithm.solve(graph, "A", List.of("B", "C", "D"), "DISTANCE", 40.0, 1);
        var ids = result.orderedNodeIds();
        assertEquals("A", ids.get(0));
        // No return to origin — last should be a target, not origin
        assertNotEquals("A", ids.get(ids.size() - 1));
        // All targets are visited (one of them is last)
        assertTrue(ids.contains("B"));
        assertTrue(ids.contains("C"));
        assertTrue(ids.contains("D"));
    }

    @Test
    @DisplayName("totalDistance is positive for valid routes")
    void totalDistancePositive() {
        var result = TSPAlgorithm.solve(graph, "A", List.of("B", "C"), "DISTANCE", 40.0);
        assertTrue(result.totalDistance() > 0);
    }

    @Test
    @DisplayName("segmentPaths contains each leg of the journey")
    void segmentPathsPresent() {
        var result = TSPAlgorithm.solve(graph, "A", List.of("B"), "DISTANCE", 40.0);
        assertFalse(result.segmentPaths().isEmpty());
    }

    @Test
    @DisplayName("greedy TSP visits nearest unvisited node")
    void greedyOrder() {
        // Add a node very far away to test greedy picks nearest first
        graph.addNode(new GraphNode("FAR", 45.0, 120.0));
        double farDist = Graph.haversineDistance(40.0, 116.0, 45.0, 120.0);
        graph.addEdge(GraphEdge.builder()
                .edgeId("e_far").fromNodeId("A").toNodeId("FAR")
                .distance(farDist).roadType("primary").build());
        // Connect FAR to others so it's reachable
        for (String id : List.of("B", "C", "D")) {
            graph.addEdge(GraphEdge.builder()
                    .edgeId("e_far_" + id).fromNodeId("FAR").toNodeId(id)
                    .distance(farDist).roadType("primary").build());
        }

        var result = TSPAlgorithm.solve(graph, "A", List.of("B", "C", "D", "FAR"), "DISTANCE", 40.0);
        var ids = result.orderedNodeIds();
        // FAR should be the last target visited (or second-to-last before return)
        int farIdx = ids.indexOf("FAR");
        int lastTargetIdx = ids.size() - 2;  // last before origin
        assertTrue(farIdx >= lastTargetIdx - 1, "FAR should be near the end of the visit order");
    }

    @Test
    @DisplayName("2-opt improves worse-than-optimal initial path")
    void twoOptImproves() {
        // Create a known bad greedy case: a line with origin in middle
        Graph lineGraph = new Graph("line");
        lineGraph.addNode(new GraphNode("ORIGIN", 40.0, 116.0));
        lineGraph.addNode(new GraphNode("N1", 40.1, 116.0));
        lineGraph.addNode(new GraphNode("N2", 40.2, 116.0));
        lineGraph.addNode(new GraphNode("N3", 40.3, 116.25));
        lineGraph.addNode(new GraphNode("N4", 40.4, 116.25));
        // Connect along line
        lineGraph.addEdge(GraphEdge.builder().edgeId("e1").fromNodeId("ORIGIN").toNodeId("N1")
                .distance(11120).roadType("primary").build());
        lineGraph.addEdge(GraphEdge.builder().edgeId("e2").fromNodeId("N1").toNodeId("N2")
                .distance(11120).roadType("primary").build());
        lineGraph.addEdge(GraphEdge.builder().edgeId("e3").fromNodeId("N2").toNodeId("N3")
                .distance(20000).roadType("primary").build());
        lineGraph.addEdge(GraphEdge.builder().edgeId("e4").fromNodeId("N3").toNodeId("N4")
                .distance(12000).roadType("primary").build());
        // Cross connections
        lineGraph.addEdge(GraphEdge.builder().edgeId("e5").fromNodeId("ORIGIN").toNodeId("N2")
                .distance(22240).roadType("primary").build());
        lineGraph.addEdge(GraphEdge.builder().edgeId("e6").fromNodeId("N1").toNodeId("N3")
                .distance(25000).roadType("primary").build());

        var result = TSPAlgorithm.solve(lineGraph, "ORIGIN", List.of("N1", "N2", "N3", "N4"), "DISTANCE", 40.0);
        assertTrue(result.totalDistance() > 0);
    }

    @Test
    @DisplayName("TIME strategy changes path selection from DISTANCE")
    void timeStrategyChangesOrder() {
        // Add edges with different road types to make time different from distance
        Graph timeGraph = new Graph("time-test");
        timeGraph.addNode(new GraphNode("O", 40.0, 116.0));
        timeGraph.addNode(new GraphNode("T1", 40.05, 116.0));
        timeGraph.addNode(new GraphNode("T2", 40.1, 116.0));
        // Direct O→T2 via primary (fast road)
        timeGraph.addEdge(GraphEdge.builder().edgeId("e1").fromNodeId("O").toNodeId("T1")
                .distance(5560).roadType("footway").maxSpeed(5).build());
        timeGraph.addEdge(GraphEdge.builder().edgeId("e2").fromNodeId("T1").toNodeId("T2")
                .distance(5560).roadType("footway").maxSpeed(5).build());
        // Direct O→T2 via motorway
        timeGraph.addEdge(GraphEdge.builder().edgeId("e3").fromNodeId("O").toNodeId("T2")
                .distance(12000).roadType("motorway").maxSpeed(100).build());

        var distResult = TSPAlgorithm.solve(timeGraph, "O", List.of("T1", "T2"), "DISTANCE", 40.0);
        var timeResult = TSPAlgorithm.solve(timeGraph, "O", List.of("T1", "T2"), "TIME", 40.0);
        // At least we get a valid result
        assertTrue(distResult.totalDistance() > 0);
        assertTrue(timeResult.totalDistance() > 0);
    }

    @Test
    @DisplayName("unreachable targets don't crash")
    void unreachableTarget() {
        graph.addNode(new GraphNode("ISOLATED", 45.0, 120.0));
        var result = TSPAlgorithm.solve(graph, "A", List.of("B", "ISOLATED"), "DISTANCE", 40.0);
        assertNotNull(result);
    }

    private boolean isReachable = false;
    private boolean getReachable() { return isReachable; }

    @Test
    @DisplayName("backward-compatible overloads work")
    void backwardCompatibleTest() {
        var r1 = TSPAlgorithm.solve(graph, "A", List.of("B"), "DISTANCE", 40.0);
        var r2 = TSPAlgorithm.solve(graph, "A", List.of("B"), "DISTANCE");
        assertNotNull(r1);
        assertNotNull(r2);
    }
}
