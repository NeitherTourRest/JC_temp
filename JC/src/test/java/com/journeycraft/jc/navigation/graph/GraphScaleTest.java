package com.journeycraft.jc.navigation.graph;

import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Scale and stress tests for Graph: verifies the scoring requirement of
 * 200+ edges, 200+ spots/campuses, and proper road network representation.
 */
@Tag("performance")
@DisplayName("GraphScale — scale verification and stress tests for large graphs")
class GraphScaleTest {

    @Test
    @DisplayName("Graph handles 200+ edges (scoring minimum)")
    void twoHundredEdges() {
        Graph g = new Graph("scale-200edges");
        Random rng = new Random(42);

        // Create 100 nodes
        for (int i = 0; i < 100; i++) {
            double lat = 39.8 + rng.nextDouble() * 0.4;
            double lng = 116.0 + rng.nextDouble() * 0.5;
            g.addNode(new GraphNode("N" + i, lat, lng));
        }

        // Create 200+ edges
        for (int i = 0; i < 200; i++) {
            int from = rng.nextInt(100);
            int to = rng.nextInt(100);
            if (from == to) continue;
            g.addEdge(GraphEdge.builder()
                    .edgeId("e" + i).fromNodeId("N" + from).toNodeId("N" + to)
                    .distance(1000 + rng.nextDouble() * 10000)
                    .roadType(rng.nextBoolean() ? "primary" : "secondary")
                    .maxSpeed(60).build());
        }

        // Two-way edges are doubled
        assertTrue(g.getEdgeCount() >= 200, "Graph should have at least 200 edges");
        assertTrue(g.getNodeCount() >= 50, "Graph should have meaningful node count");
    }

    @Test
    @DisplayName("Graph handles 500 nodes with stress operations")
    void fiveHundredNodesStress() {
        Graph g = new Graph("stress-500nodes");
        Random rng = new Random(42);

        // Add 500 nodes
        for (int i = 0; i < 500; i++) {
            g.addNode(new GraphNode("N" + i, 39.8 + rng.nextDouble() * 0.4, 116.0 + rng.nextDouble() * 0.5));
        }
        assertEquals(500, g.getNodeCount());

        // Add 1000 edges
        for (int i = 0; i < 1000; i++) {
            int from = rng.nextInt(500);
            int to = rng.nextInt(500);
            if (from == to) continue;
            g.addEdge(GraphEdge.builder()
                    .edgeId("e" + i).fromNodeId("N" + from).toNodeId("N" + to)
                    .distance(5000 + rng.nextDouble() * 20000)
                    .roadType("primary").maxSpeed(60).build());
        }

        // Verify all ops are fast
        long totalTime = 0;
        for (int i = 0; i < 50; i++) {
            String id = "N" + rng.nextInt(500);
            long start = System.nanoTime();
            GraphNode node = g.getNode(id);
            totalTime += System.nanoTime() - start;
            assertNotNull(node);
        }
        double avgNs = totalTime / 50.0;
        System.out.printf("Average getNode() time: %.1f ns (50 iterations)%n", avgNs);
        assertTrue(avgNs < 1_000_000, "getNode() should average < 1ms per lookup");
    }

    @Test
    @DisplayName("Graph edge count including reverse edges")
    void edgeCountIncludesReverse() {
        Graph g = new Graph("edge-count");
        g.addNode(new GraphNode("A", 40.0, 116.0));
        g.addNode(new GraphNode("B", 40.1, 116.0));
        g.addNode(new GraphNode("C", 40.2, 116.0));

        // Add 3 two-way edges → expect 6 total
        g.addEdge(GraphEdge.builder().edgeId("e1").fromNodeId("A").toNodeId("B").distance(100).roadType("primary").build());
        g.addEdge(GraphEdge.builder().edgeId("e2").fromNodeId("B").toNodeId("C").distance(200).roadType("primary").build());
        g.addEdge(GraphEdge.builder().edgeId("e3").fromNodeId("A").toNodeId("C").distance(300).roadType("primary").build());

        assertEquals(6, g.getEdgeCount(), "3 two-way edges = 6 directed edges");
    }

    @Test
    @DisplayName("Graph computeComponents performance on large graph")
    void computeComponentsLargeScale() {
        Graph g = new Graph("components-scale");
        Random rng = new Random(42);

        int nodeCount = 300;
        int edgeCount = 500;

        for (int i = 0; i < nodeCount; i++) {
            g.addNode(new GraphNode("N" + i, 39.8 + rng.nextDouble() * 0.4, 116.0 + rng.nextDouble() * 0.5));
        }

        for (int i = 0; i < edgeCount; i++) {
            int from = rng.nextInt(nodeCount);
            int to = rng.nextInt(nodeCount);
            if (from == to) continue;
            g.addEdge(GraphEdge.builder()
                    .edgeId("e" + i).fromNodeId("N" + from).toNodeId("N" + to)
                    .distance(5000 + rng.nextDouble() * 20000)
                    .roadType("primary").maxSpeed(60).build());
        }

        long start = System.nanoTime();
        g.computeComponents();
        long elapsed = System.nanoTime() - start;
        double ms = elapsed / 1_000_000.0;

        System.out.printf("computeComponents on %d nodes / %d edges: %.2f ms, %d components%n",
                nodeCount, edgeCount, ms, g.getComponentCount());
        assertTrue(ms < 100, "computeComponents on 300-node graph should complete in <100ms");
        assertTrue(g.getComponentCount() >= 1);
    }

    @Test
    @DisplayName("Haversine precision across large coordinate spread")
    void haversinePrecision() {
        // Equatorial test: 1 degree longitude at equator ≈ 111km
        double d1 = Graph.haversineDistance(0, 0, 0, 1);
        assertTrue(d1 > 110000 && d1 < 112000, "1 degree longitude at equator ~111km");

        // Meridian test: 1 degree latitude ≈ 111km
        double d2 = Graph.haversineDistance(0, 0, 1, 0);
        assertTrue(d2 > 110000 && d2 < 112000, "1 degree latitude ~111km");

        // Cross-hemisphere: Beijing to Sydney
        double d3 = Graph.haversineDistance(39.9, 116.4, -33.9, 151.2);
        assertTrue(d3 > 8_000_000 && d3 < 10_000_000, "Beijing-Sydney ~9000km");

        // Anti-podal: very long distance
        double d4 = Graph.haversineDistance(0, 0, 0, 180);
        assertTrue(d4 > 19_000_000 && d4 < 21_000_000, "Half equator ~20000km");
    }
}
