package com.journeycraft.jc.navigation.graph;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.junit.jupiter.api.Assertions.*;

import java.util.List;

@DisplayName("Graph — adjacency-list navigation graph")
class GraphTest {

    private Graph graph;

    @BeforeEach
    void setUp() {
        graph = new Graph("test");
    }

    @Test
    @DisplayName("addNode stores node and updates count")
    void addNode() {
        graph.addNode(new GraphNode("A", 40.0, 116.0));
        assertEquals(1, graph.getNodeCount());
        assertNotNull(graph.getNode("A"));
    }

    @Test
    @DisplayName("getNode returns null for missing node")
    void getNodeMissing() {
        assertNull(graph.getNode("NONEXISTENT"));
    }

    @Test
    @DisplayName("containsNode returns correct boolean")
    void containsNode() {
        graph.addNode(new GraphNode("X", 40.0, 116.0));
        assertTrue(graph.containsNode("X"));
        assertFalse(graph.containsNode("Y"));
    }

    @Test
    @DisplayName("addEdge creates two-way edges automatically")
    void addEdgeTwoWay() {
        graph.addNode(new GraphNode("A", 40.0, 116.0));
        graph.addNode(new GraphNode("B", 40.1, 116.1));
        graph.addEdge(GraphEdge.builder().edgeId("e1").fromNodeId("A").toNodeId("B")
                .distance(1000).roadType("primary").build());

        assertEquals(2, graph.getEdgeCount(), "One edge + reverse = 2");
        assertEquals(1, graph.getEdges("A").size());
        assertEquals(1, graph.getEdges("B").size());
    }

    @Test
    @DisplayName("addEdge for one-way creates only forward edge")
    void addEdgeOneWay() {
        graph.addNode(new GraphNode("A", 40.0, 116.0));
        graph.addNode(new GraphNode("B", 40.1, 116.1));
        graph.addEdge(GraphEdge.builder().edgeId("e1").fromNodeId("A").toNodeId("B")
                .distance(500).roadType("primary").isOneWay(true).build());

        assertEquals(1, graph.getEdgeCount());
        assertEquals(1, graph.getEdges("A").size());
        assertEquals(0, graph.getEdges("B").size());
    }

    @Test
    @DisplayName("findNearestNode returns closest node by Haversine distance")
    void findNearestNode() {
        graph.addNode(new GraphNode("A", 40.0, 116.0));
        graph.addNode(new GraphNode("B", 40.1, 116.0));
        var nearest = graph.findNearestNode(40.0, 116.0);
        assertEquals("A", nearest.getNodeId());
    }

    @Test
    @DisplayName("findNearestNode returns null on empty graph")
    void findNearestNodeEmpty() {
        assertNull(graph.findNearestNode(40.0, 116.0));
    }

    @Test
    @DisplayName("haversineDistance computes ~111km per degree latitude")
    void haversineDistance() {
        double dist = Graph.haversineDistance(40.0, 116.0, 41.0, 116.0);
        assertTrue(dist > 110000 && dist < 112000, "~111 km per degree");
    }

    @Test
    @DisplayName("haversineDistance is commutative")
    void haversineCommutative() {
        double d1 = Graph.haversineDistance(39.9, 116.3, 40.1, 116.5);
        double d2 = Graph.haversineDistance(40.1, 116.5, 39.9, 116.3);
        assertEquals(d1, d2, 0.001);
    }

    @Test
    @DisplayName("haversineDistance zero for same point")
    void haversineZero() {
        assertEquals(0.0, Graph.haversineDistance(40.0, 116.0, 40.0, 116.0), 0.001);
    }

    @Test
    @DisplayName("computeComponents detects a single connected component")
    void computeComponentsSingle() {
        graph.addNode(new GraphNode("A", 40.0, 116.0));
        graph.addNode(new GraphNode("B", 40.1, 116.0));
        graph.addEdge(GraphEdge.builder().edgeId("e1").fromNodeId("A").toNodeId("B")
                .distance(100).roadType("primary").build());

        graph.computeComponents();
        assertEquals(1, graph.getComponentCount());
    }

    @Test
    @DisplayName("computeComponents detects two disconnected components")
    void computeComponentsDisconnected() {
        graph.addNode(new GraphNode("A", 40.0, 116.0));
        graph.addNode(new GraphNode("B", 40.1, 116.0));
        graph.addNode(new GraphNode("C", 41.0, 117.0));
        graph.addEdge(GraphEdge.builder().edgeId("e1").fromNodeId("A").toNodeId("B")
                .distance(100).roadType("primary").build());
        // C has no edge — disconnected

        graph.computeComponents();
        assertEquals(2, graph.getComponentCount());
    }

    @Test
    @DisplayName("isSameComponent detects same vs different components")
    void isSameComponent() {
        graph.addNode(new GraphNode("A", 40.0, 116.0));
        graph.addNode(new GraphNode("B", 40.1, 116.0));
        graph.addNode(new GraphNode("C", 41.0, 117.0));
        graph.addEdge(GraphEdge.builder().edgeId("e1").fromNodeId("A").toNodeId("B")
                .distance(100).roadType("primary").build());

        graph.computeComponents();
        assertTrue(graph.isSameComponent("A", "B"));
        assertFalse(graph.isSameComponent("A", "C"));
    }

    @Test
    @DisplayName("resetNodes clears visited, distance, previous for all nodes")
    void resetNodes() {
        graph.addNode(new GraphNode("A", 40.0, 116.0));
        graph.addNode(new GraphNode("B", 40.1, 116.0));
        var a = graph.getNode("A");
        var b = graph.getNode("B");
        a.setVisited(true);
        a.setDistance(500);
        a.setPrevious(b);
        b.setVisited(true);

        graph.resetNodes();

        assertFalse(a.isVisited());
        assertEquals(Double.MAX_VALUE, a.getDistance());
        assertNull(a.getPrevious());
        assertFalse(b.isVisited());
    }

    @Test
    @DisplayName("getNodes returns unmodifiable collection")
    void getNodesUnmodifiable() {
        graph.addNode(new GraphNode("A", 40.0, 116.0));
        var nodes = graph.getNodes();
        assertThrows(Exception.class, () -> {
            if (nodes instanceof java.util.Collection) {
                ((java.util.Collection<GraphNode>) nodes).clear();
            }
        });
    }

    @Test
    @DisplayName("bounding box updates on node addition")
    void boundingBox() {
        graph.addNode(new GraphNode("A", 39.9, 116.0));
        graph.addNode(new GraphNode("B", 40.2, 117.0));
        assertEquals(39.9, graph.getMinLat(), 0.001);
        assertEquals(40.2, graph.getMaxLat(), 0.001);
        assertEquals(116.0, graph.getMinLng(), 0.001);
        assertEquals(117.0, graph.getMaxLng(), 0.001);
    }

    @Test
    @DisplayName("toString includes name and counts")
    void toStringContainsInfo() {
        graph.addNode(new GraphNode("A", 40.0, 116.0));
        String s = graph.toString();
        assertTrue(s.contains("test"));
        assertTrue(s.contains("nodes=1"));
    }
}
