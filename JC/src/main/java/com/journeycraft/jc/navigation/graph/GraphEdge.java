package com.journeycraft.jc.navigation.graph;

import lombok.*;

/**
 * An edge in the navigation graph connecting two nodes.
 * Supports multiple weight calculation strategies (distance, time, congestion-aware).
 * Self-designed data structure.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GraphEdge {

    /** Unique edge identifier (e.g., OSM way ID) */
    private String edgeId;

    /** Source node ID */
    private String fromNodeId;

    /** Target node ID */
    private String toNodeId;

    /** Physical distance in meters */
    private double distance;

    /** Road type classification */
    private String roadType;

    /** Human-readable road name */
    private String name;

    /** Whether this is a one-way edge */
    private boolean isOneWay;

    /** Maximum speed in km/h */
    private double maxSpeed;

    /** Current congestion level: LOW, MEDIUM, HIGH */
    @Builder.Default
    private String congestionLevel = "LOW";

    /**
     * Calculate travel time in seconds using default max speed.
     */
    public double getTravelTimeSeconds() {
        return getTravelTimeSeconds(40.0);
    }

    /**
     * Get effective speed considering road type and congestion,
     * capped by the maximum speed of the transport mode.
     * @param maxSpeedCap max speed in km/h for the transport (e.g. WALK=5, BIKE=15, SHUTTLE=30)
     */
    public double getEffectiveSpeed(double maxSpeedCap) {
        double baseSpeed = switch (roadType != null ? roadType.toLowerCase() : "") {
            case "motorway", "trunk" -> 100.0;
            case "primary" -> 60.0;
            case "secondary" -> 50.0;
            case "tertiary" -> 40.0;
            case "residential" -> 30.0;
            case "service" -> 20.0;
            case "footway", "path", "pedestrian", "steps" -> 5.0;
            case "cycleway" -> 15.0;
            default -> 40.0;
        };

        // Cap road speed by transport max
        baseSpeed = Math.min(baseSpeed, maxSpeedCap);

        // Adjust for congestion
        double congestionFactor = switch (congestionLevel) {
            case "HIGH" -> 0.4;
            case "MEDIUM" -> 0.7;
            default -> 1.0;
        };

        return baseSpeed * congestionFactor;
    }

    /**
     * Get travel time in seconds based on transport mode speed cap.
     */
    public double getTravelTimeSeconds(double transportSpeedKmh) {
        double effectiveSpeed = getEffectiveSpeed(transportSpeedKmh);
        double speedMs = effectiveSpeed * 1000.0 / 3600.0;
        return distance / speedMs;
    }

    /**
     * Get the weight for pathfinding with transport-aware time calculation.
     */
    public double getWeight(String strategy, double transportSpeedKmh) {
        if ("TIME".equalsIgnoreCase(strategy)) {
            return getTravelTimeSeconds(transportSpeedKmh);
        }
        return distance;
    }

    @Override
    public String toString() {
        return "GraphEdge{" + fromNodeId + " -> " + toNodeId + ", dist=" + distance + "m, road=" + roadType + '}';
    }
}
