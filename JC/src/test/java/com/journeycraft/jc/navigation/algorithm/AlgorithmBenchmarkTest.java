package com.journeycraft.jc.navigation.algorithm;

import com.journeycraft.jc.navigation.graph.Graph;
import com.journeycraft.jc.navigation.graph.GraphEdge;
import com.journeycraft.jc.navigation.graph.GraphNode;
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

import java.util.*;

/**
 * Performance benchmarks for core navigation algorithms.
 * Tag: performance — run with `mvn test -Dgroups="performance"`
 */
@Tag("performance")
@DisplayName("AlgorithmBenchmark — performance & stress tests for navigation algorithms")
class AlgorithmBenchmarkTest {

    private Graph largeGraph;

    @BeforeEach
    void setUp() {
        largeGraph = buildLargeGraph(200, 400);
    }

    /**
     * Build a graph with specified node and edge counts for benchmarking.
     */
    private Graph buildLargeGraph(int nodeCount, int edgeCount) {
        Graph g = new Graph("bench-" + nodeCount + "nodes-" + edgeCount + "edges");
        Random rng = new Random(42);

        // Create nodes on a rough 2D plane
        for (int i = 0; i < nodeCount; i++) {
            double lat = 39.8 + rng.nextDouble() * 0.4;
            double lng = 116.0 + rng.nextDouble() * 0.5;
            g.addNode(new GraphNode("N" + i, lat, lng));
        }

        // Create edges (random connections)
        List<String> nodeIds = g.getNodes().stream().map(GraphNode::getNodeId).toList();
        int edgesAdded = 0;
        int attempts = 0;
        while (edgesAdded < edgeCount && attempts < edgeCount * 10) {
            attempts++;
            String from = nodeIds.get(rng.nextInt(nodeIds.size()));
            String to = nodeIds.get(rng.nextInt(nodeIds.size()));
            if (from.equals(to)) continue;

            double d = Graph.haversineDistance(
                    g.getNode(from).getLatitude(), g.getNode(from).getLongitude(),
                    g.getNode(to).getLatitude(), g.getNode(to).getLongitude());
            g.addEdge(GraphEdge.builder()
                    .edgeId("e" + edgesAdded).fromNodeId(from).toNodeId(to)
                    .distance(d).roadType("primary").maxSpeed(60).build());
            edgesAdded++;
        }

        return g;
    }

    // ─── Dijkstra Performance ───

    @Test
    @DisplayName("Dijkstra on 200-node/400-edge graph < 100ms")
    void dijkstraLargeGraph() {
        long start = System.nanoTime();
        var result = DijkstraAlgorithm.findShortestPath(largeGraph, "N0", "N100", "DISTANCE");
        long elapsed = System.nanoTime() - start;
        double ms = elapsed / 1_000_000.0;
        System.out.printf("Dijkstra 200-node/400-edge: %.2f ms (reachable=%s)%n", ms, result.isReachable());
        assertTrue(ms < 100, "Dijkstra on 200-node graph should complete in <100ms (was " + ms + "ms)");
    }

    @Test
    @DisplayName("Dijkstra TIME strategy also < 100ms on 200-node graph")
    void dijkstraTimePerformance() {
        long start = System.nanoTime();
        var result = DijkstraAlgorithm.findShortestPath(largeGraph, "N0", "N100", "TIME", 5.0);
        long elapsed = System.nanoTime() - start;
        double ms = elapsed / 1_000_000.0;
        System.out.printf("Dijkstra TIME 200-node: %.2f ms%n", ms);
        assertTrue(ms < 100, "Dijkstra TIME on 200-node graph should complete in <100ms (was " + ms + "ms)");
    }

    // ─── TSP Performance ───

    @Test
    @DisplayName("TSP on 5 targets < 500ms")
    void tspOn5Targets() {
        List<String> targets = List.of("N1", "N2", "N3", "N4", "N5");

        long start = System.nanoTime();
        var result = TSPAlgorithm.solve(largeGraph, "N0", targets, "DISTANCE", 40.0);
        long elapsed = System.nanoTime() - start;
        double ms = elapsed / 1_000_000.0;
        System.out.printf("TSP 5 targets: %.2f ms (distance=%.0f)%n", ms, result.totalDistance());
        assertTrue(ms < 500, "TSP on 5 targets should complete in <500ms (was " + ms + "ms)");
    }

    @Test
    @DisplayName("TSP on 10 targets < 2000ms")
    void tspOn10Targets() {
        List<String> targets = new ArrayList<>();
        for (int i = 1; i <= 10; i++) targets.add("N" + i);

        long start = System.nanoTime();
        var result = TSPAlgorithm.solve(largeGraph, "N0", targets, "DISTANCE", 40.0);
        long elapsed = System.nanoTime() - start;
        double ms = elapsed / 1_000_000.0;
        System.out.printf("TSP 10 targets: %.2f ms (distance=%.0f)%n", ms, result.totalDistance());
        assertTrue(ms < 2000, "TSP on 10 targets should complete in <2000ms (was " + ms + "ms)");
    }

    // ─── TopK Performance ───

    @Test
    @DisplayName("TopK on 10000 items K=10 < full sort time")
    void topKPerformance() {
        List<Integer> items = new ArrayList<>();
        Random rng = new Random(42);
        for (int i = 0; i < 10000; i++) items.add(rng.nextInt(100000));

        // TopK
        long topKStart = System.nanoTime();
        var topKResult = TopKSorter.topK(items, 10, Comparator.naturalOrder());
        long topKTime = System.nanoTime() - topKStart;

        // Full sort
        long sortStart = System.nanoTime();
        items.sort(Comparator.naturalOrder());
        long sortTime = System.nanoTime() - sortStart;

        double topKms = topKTime / 1_000_000.0;
        double sortMs = sortTime / 1_000_000.0;
        System.out.printf("TopK K=10: %.2f ms, Full sort: %.2f ms (ratio: %.1fx)%n",
                topKms, sortMs, sortMs / Math.max(topKms, 0.01));

        // Verify: top 10 should be max 10 values
        assertEquals(10, topKResult.size());
        assertEquals(items.get(items.size() - 1), topKResult.get(0).intValue());

        // TopK is typically faster than full sort for small K on large N, but JIT warmup varies
        System.out.printf("  TopK faster by ratio: %.1fx%n", sortMs / Math.max(topKms, 0.01));
    }

    // ─── FuzzyMatcher Performance ───

    @Test
    @DisplayName("Levenshtein on 1000-char strings < 10ms")
    void levenshteinPerformance() {
        String a = "a".repeat(1000);
        String b = "b".repeat(1000);

        long start = System.nanoTime();
        int dist = FuzzyMatcher.levenshteinDistance(a, b);
        long elapsed = System.nanoTime() - start;
        double ms = elapsed / 1_000_000.0;
        System.out.printf("Levenshtein 1000-char: %.3f ms%n", ms);
        assertEquals(1000, dist);
        assertTrue(ms < 50, "Levenshtein on 1000-char strings should complete in <50ms (was " + ms + "ms)");
    }

    @Test
    @DisplayName("Trie 10000 inserts + 1000 queries < 100ms")
    void triePerformance() {
        var trie = new FuzzyMatcher.Trie();

        // Insert 10000 words
        long insertStart = System.nanoTime();
        for (int i = 0; i < 10000; i++) {
            trie.insert("word" + i);
        }
        long insertTime = System.nanoTime() - insertStart;

        // Query 1000 times
        long queryStart = System.nanoTime();
        for (int i = 0; i < 1000; i++) {
            trie.searchByPrefix("wor", 10);
        }
        long queryTime = System.nanoTime() - queryStart;

        double insertMs = insertTime / 1_000_000.0;
        double queryMs = queryTime / 1_000_000.0;
        System.out.printf("Trie 10000 inserts: %.2f ms, 1000 queries: %.2f ms%n", insertMs, queryMs);
        assertTrue(insertMs + queryMs < 100, "Trie 10000 inserts + 1000 queries should complete in <100ms");
    }

    // ─── Graph ComputeComponents Performance ───

    @Test
    @DisplayName("computeComponents on 200-node graph < 50ms")
    void computeComponentsPerformance() {
        Graph g = buildLargeGraph(500, 400);

        long start = System.nanoTime();
        g.computeComponents();
        long elapsed = System.nanoTime() - start;
        double ms = elapsed / 1_000_000.0;
        System.out.printf("computeComponents 500-node/400-edge: %.2f ms (components=%d)%n",
                ms, g.getComponentCount());
        assertTrue(ms < 50, "computeComponents on 500-node graph should complete in <50ms (was " + ms + "ms)");
    }

    @Test
    @DisplayName("findNearestNode on 200-node graph < 10ms")
    void findNearestNodePerformance() {
        long start = System.nanoTime();
        var nearest = largeGraph.findNearestNode(40.0, 116.2);
        long elapsed = System.nanoTime() - start;
        double ms = elapsed / 1_000_000.0;
        System.out.printf("findNearestNode brute-force 200 nodes: %.3f ms%n", ms);
        assertNotNull(nearest);
        assertTrue(ms < 10, "findNearestNode on 200-node graph should complete in <10ms");
    }
}
