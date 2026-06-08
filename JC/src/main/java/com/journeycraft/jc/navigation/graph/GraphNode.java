package com.journeycraft.jc.navigation.graph;

import lombok.*;

/**
 * A node in the navigation graph representing a geographic point.
 * Self-designed data structure for the graph module.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GraphNode implements Comparable<GraphNode> {
    
    /** Unique node identifier (e.g., OSM node ID) */
    private String nodeId;
    
    /** Latitude coordinate */
    private double latitude;
    
    /** Longitude coordinate */
    private double longitude;
    
    /** Human-readable name (e.g., intersection name, POI name) */
    private String name;
    
    /** Node type: INTERSECTION, POI, ENTRANCE, GATE, FACILITY, etc. */
    private String type;
    
    /** Temporary distance value for Dijkstra algorithm (mutable during computation) */
    private double distance;
    
    /** Previous node in shortest path (mutable during computation) */
    private GraphNode previous;
    
    /** Whether this node has been visited (mutable during computation) */
    private boolean visited;

    /** Connected component ID (set after computeComponents) */
    private int componentId = -1;

    public GraphNode(String nodeId, double latitude, double longitude) {
        this.nodeId = nodeId;
        this.latitude = latitude;
        this.longitude = longitude;
        this.distance = Double.MAX_VALUE;
        this.visited = false;
    }

    public GraphNode(String nodeId, double latitude, double longitude, String name, String type) {
        this(nodeId, latitude, longitude);
        this.name = name;
        this.type = type;
    }

    /** Calculate straight-line (Haversine) distance to another node in meters */
    public double haversineDistanceTo(GraphNode other) {
        final double R = 6371000; // Earth radius in meters
        double lat1 = Math.toRadians(this.latitude);
        double lat2 = Math.toRadians(other.latitude);
        double dLat = Math.toRadians(other.latitude - this.latitude);
        double dLng = Math.toRadians(other.longitude - this.longitude);
        
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(lat1) * Math.cos(lat2)
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /** Reset mutable computation fields for algorithm reuse */
    public void reset() {
        this.distance = Double.MAX_VALUE;
        this.previous = null;
        this.visited = false;
    }

    public int getComponentId() { return componentId; }
    public void setComponentId(int componentId) { this.componentId = componentId; }

    @Override
    public int compareTo(GraphNode other) {
        return Double.compare(this.distance, other.distance);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof GraphNode other)) return false;
        return nodeId != null && nodeId.equals(other.nodeId);
    }

    @Override
    public int hashCode() {
        return nodeId != null ? nodeId.hashCode() : 0;
    }

    @Override
    public String toString() {
        return "GraphNode{" + "nodeId='" + nodeId + '\'' + ", name='" + name + '\'' + '}';
    }
}
