package com.journeycraft.jc.navigation.graph;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Self-designed adjacency-list graph implementation for navigation.
 * Nodes are stored in a HashMap for O(1) lookup.
 * Edges are stored as adjacency lists per node for efficient traversal.
 * 
 * Design decisions:
 * - Adjacency list (not matrix) because the graph is sparse (road network)
 * - Two maps: nodeMap (id -> node) and adjacencyMap (nodeId -> edges)
 * - Supports dynamic edge addition/removal
 * - Thread-safe for reads; writes should be synchronized externally
 */
public class Graph {

    /** Node lookup: nodeId -> GraphNode */
    private final Map<String, GraphNode> nodeMap;

    /** Adjacency list: fromNodeId -> list of outgoing edges */
    private final Map<String, List<GraphEdge>> adjacencyMap;

    /** Bounding box of the graph */
    private double minLat = Double.MAX_VALUE, maxLat = Double.MIN_VALUE;
    private double minLng = Double.MAX_VALUE, maxLng = Double.MIN_VALUE;

    /** Graph metadata */
    private String name;
    private int version;

    /** Connected component ID -> node count (populated after build) */
    private final Map<Integer, Integer> componentSizes = new HashMap<>();
    private int componentCount = 0;

    public Graph() {
        this.nodeMap = new ConcurrentHashMap<>();
        this.adjacencyMap = new ConcurrentHashMap<>();
    }

    public Graph(String name) {
        this();
        this.name = name;
    }

    // ─── Node Operations ───

    public void addNode(GraphNode node) {
        nodeMap.put(node.getNodeId(), node);
        adjacencyMap.putIfAbsent(node.getNodeId(), new ArrayList<>());
        updateBounds(node.getLatitude(), node.getLongitude());
    }

    public GraphNode getNode(String nodeId) {
        return nodeMap.get(nodeId);
    }

    public boolean containsNode(String nodeId) {
        return nodeMap.containsKey(nodeId);
    }

    public Collection<GraphNode> getNodes() {
        return Collections.unmodifiableCollection(nodeMap.values());
    }

    public int getNodeCount() {
        return nodeMap.size();
    }

    // ─── Edge Operations ───

    public void addEdge(GraphEdge edge) {
        adjacencyMap.computeIfAbsent(edge.getFromNodeId(), k -> new ArrayList<>()).add(edge);
        
        // Auto-add reverse edge for two-way roads
        if (!edge.isOneWay()) {
            GraphEdge reverse = GraphEdge.builder()
                    .edgeId(edge.getEdgeId() + "_rev")
                    .fromNodeId(edge.getToNodeId())
                    .toNodeId(edge.getFromNodeId())
                    .distance(edge.getDistance())
                    .roadType(edge.getRoadType())
                    .name(edge.getName())
                    .isOneWay(false)
                    .maxSpeed(edge.getMaxSpeed())
                    .congestionLevel(edge.getCongestionLevel())
                    .build();
            adjacencyMap.computeIfAbsent(reverse.getFromNodeId(), k -> new ArrayList<>()).add(reverse);
        }
    }

    public List<GraphEdge> getEdges(String fromNodeId) {
        return adjacencyMap.getOrDefault(fromNodeId, Collections.emptyList());
    }

    public int getEdgeCount() {
        return adjacencyMap.values().stream().mapToInt(List::size).sum();
    }

    // ─── Graph Utilities ───

    /** Find the nearest node to given coordinates using brute-force search */
    public GraphNode findNearestNode(double lat, double lng) {
        GraphNode nearest = null;
        double minDist = Double.MAX_VALUE;
        for (GraphNode node : nodeMap.values()) {
            double dist = haversineDistance(lat, lng, node.getLatitude(), node.getLongitude());
            if (dist < minDist) {
                minDist = dist;
                nearest = node;
            }
        }
        return nearest;
    }

    /** Haversine distance in meters */
    public static double haversineDistance(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /** Reset all node computation fields for algorithm reuse */
    public void resetNodes() {
        for (GraphNode node : nodeMap.values()) {
            node.reset();
        }
    }

    private void updateBounds(double lat, double lng) {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
    }

    /**
     * Compute connected components using BFS.
     * After calling this, each node has componentId set.
     * Nodes in different components have no path between them.
     */
    public void computeComponents() {
        resetNodes();
        componentSizes.clear();
        componentCount = 0;

        for (GraphNode node : nodeMap.values()) {
            if (node.isVisited()) continue;

            // BFS from this node
            int compId = componentCount++;
            Queue<GraphNode> queue = new LinkedList<>();
            queue.add(node);
            node.setVisited(true);
            int size = 0;

            while (!queue.isEmpty()) {
                GraphNode current = queue.poll();
                current.setComponentId(compId);
                size++;

                for (GraphEdge edge : adjacencyMap.getOrDefault(current.getNodeId(), List.of())) {
                    GraphNode neighbor = nodeMap.get(edge.getToNodeId());
                    if (neighbor != null && !neighbor.isVisited()) {
                        neighbor.setVisited(true);
                        queue.add(neighbor);
                    }
                }
            }
            componentSizes.put(compId, size);
        }

        resetNodes();
    }

    /**
     * Check if two nodes are in the same connected component.
     */
    public boolean isSameComponent(String nodeIdA, String nodeIdB) {
        GraphNode a = nodeMap.get(nodeIdA);
        GraphNode b = nodeMap.get(nodeIdB);
        if (a == null || b == null) return false;
        return a.getComponentId() == b.getComponentId();
    }

    /**
     * Get component info for logging/debugging.
     */
    public int getComponentCount() { return componentCount; }
    public Map<Integer, Integer> getComponentSizes() { return componentSizes; }

    // ─── Getters/Setters ───

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }
    public double getMinLat() { return minLat; }
    public double getMaxLat() { return maxLat; }
    public double getMinLng() { return minLng; }
    public double getMaxLng() { return maxLng; }

    @Override
    public String toString() {
        return "Graph{name='" + name + "', nodes=" + getNodeCount() + ", edges=" + getEdgeCount() + '}';
    }
}
