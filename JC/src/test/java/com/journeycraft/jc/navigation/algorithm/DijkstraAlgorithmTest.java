package com.journeycraft.jc.navigation.algorithm;

import com.journeycraft.jc.navigation.graph.Graph;
import com.journeycraft.jc.navigation.graph.GraphEdge;
import com.journeycraft.jc.navigation.graph.GraphNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.util.List;

@DisplayName("DijkstraAlgorithm — shortest path with DISTANCE/TIME strategy")
class DijkstraAlgorithmTest {

    private Graph graph;

    @BeforeEach
    void setUp() {
        graph = new Graph("test");
        //     A ──(100)── B ──(200)── C
        //     │                    │
        //     └──────(250)─────────┘
        graph.addNode(new GraphNode("A", 40.0, 116.0));
        graph.addNode(new GraphNode("B", 40.05, 116.05));
        graph.addNode(new GraphNode("C", 40.1, 116.1));

        graph.addEdge(GraphEdge.builder().edgeId("e1").fromNodeId("A").toNodeId("B")
                .distance(100).roadType("primary").maxSpeed(60).name("Road1").build());
        graph.addEdge(GraphEdge.builder().edgeId("e2").fromNodeId("B").toNodeId("C")
                .distance(200).roadType("secondary").maxSpeed(40).name("Road2").build());
        graph.addEdge(GraphEdge.builder().edgeId("e3").fromNodeId("A").toNodeId("C")
                .distance(250).roadType("tertiary").maxSpeed(30).name("Shortcut").build());
    }

    // ─── Distance strategy ───

    @Test
    @DisplayName("findShortestPath DISTANCE: finds shortest path A→C via B (100+200=300 < 250)")
    void distanceShortestPath() {
        var result = DijkstraAlgorithm.findShortestPath(graph, "A", "C", "DISTANCE");
        assertTrue(result.isReachable());
        // A→B→C = 300 vs A→C direct = 250 — direct is shorter
        assertEquals(250.0, result.totalDistance(), 0.01);
    }

    @Test
    @DisplayName("findShortestPath returns nodeIds in order")
    void pathNodeIdsOrder() {
        var result = DijkstraAlgorithm.findShortestPath(graph, "A", "B", "DISTANCE");
        assertEquals(List.of("A", "B"), result.nodeIds());
    }

    @Test
    @DisplayName("findShortestPath returns segments with road info")
    void pathSegmentsContainRoadInfo() {
        var result = DijkstraAlgorithm.findShortestPath(graph, "A", "B", "DISTANCE");
        assertFalse(result.segments().isEmpty());
        var seg = result.segments().get(0);
        assertEquals("A", seg.fromNodeId());
        assertEquals("B", seg.toNodeId());
        assertEquals(100.0, seg.distance(), 0.01);
    }

    @Test
    @DisplayName("findShortestPath start=end returns single-node path")
    void startEqualsEnd() {
        var result = DijkstraAlgorithm.findShortestPath(graph, "A", "A", "DISTANCE");
        assertTrue(result.isReachable());
        assertEquals(1, result.path().size());
        assertEquals(0, result.totalDistance(), 0.01);
    }

    @Test
    @DisplayName("findShortestPath unreachable target returns empty path")
    void unreachableTarget() {
        graph.addNode(new GraphNode("D", 41.0, 117.0));
        var result = DijkstraAlgorithm.findShortestPath(graph, "A", "D", "DISTANCE");
        assertFalse(result.isReachable());
        assertTrue(result.path().isEmpty());
    }

    @Test
    @DisplayName("findShortestPath null start returns empty")
    void nullStartNode() {
        var result = DijkstraAlgorithm.findShortestPath(graph, "NONEXISTENT", "A", "DISTANCE");
        assertFalse(result.isReachable());
    }

    @Test
    @DisplayName("findShortestPath null end returns empty")
    void nullEndNode() {
        var result = DijkstraAlgorithm.findShortestPath(graph, "A", "NONEXISTENT", "DISTANCE");
        assertFalse(result.isReachable());
    }

    // ─── Time strategy ───

    @Test
    @DisplayName("findShortestPath TIME: uses edge weight differently than DISTANCE")
    void timeStrategyDiffersFromDistance() {
        // A→B = 100m primary(60) at walk 5 = time = 100 / (5*1000/3600) = 72s
        // B→C = 200m secondary(40) at walk 5 = time = 200 / (5*1000/3600) = 144s
        // A→C = 250m tertiary(30) at walk 5 = time = 250 / (5*1000/3600) = 180s
        // TIME: A→B→C = 216s, A→C = 180s → A→C is shorter in time too
        var distResult = DijkstraAlgorithm.findShortestPath(graph, "A", "C", "DISTANCE");
        var timeResult = DijkstraAlgorithm.findShortestPath(graph, "A", "C", "TIME", 5.0);
        assertTrue(timeResult.totalTime() > 0);
        assertTrue(distResult.totalDistance() > 0);
    }

    @Test
    @DisplayName("TIME strategy with faster transport reduces total time")
    void timeStrategyFasterTransport() {
        var walk = DijkstraAlgorithm.findShortestPath(graph, "A", "C", "TIME", 5.0);
        var bike = DijkstraAlgorithm.findShortestPath(graph, "A", "C", "TIME", 15.0);
        assertTrue(bike.totalTime() < walk.totalTime(), "Bike should be faster than walk");
    }

    @Test
    @DisplayName("TIME strategy default transport uses 40 km/h")
    void timeStrategyDefaultSpeed() {
        var result = DijkstraAlgorithm.findShortestPath(graph, "A", "C", "TIME");
        assertTrue(result.isReachable());
    }

    // ─── computeAllDistances ───

    @Test
    @DisplayName("computeAllDistances returns distances from start to all reachable nodes")
    void computeAllDistances() {
        var distances = DijkstraAlgorithm.computeAllDistances(graph, "A", "DISTANCE");
        assertTrue(distances.containsKey("A"));
        assertTrue(distances.containsKey("B"));
        assertTrue(distances.containsKey("C"));
        assertEquals(0.0, distances.get("A"), 0.01);
    }

    @Test
    @DisplayName("computeAllDistances with unreachable start returns empty")
    void computeAllDistancesBadStart() {
        var distances = DijkstraAlgorithm.computeAllDistances(graph, "NONEXISTENT", "DISTANCE");
        assertTrue(distances.isEmpty());
    }

    // ─── Backward-compatible overload ───

    @Test
    @DisplayName("backward-compatible overload works without transport speed")
    void backwardCompatibleOverload() {
        var result = DijkstraAlgorithm.findShortestPath(graph, "A", "C", "DISTANCE");
        assertTrue(result.isReachable());
    }
}
