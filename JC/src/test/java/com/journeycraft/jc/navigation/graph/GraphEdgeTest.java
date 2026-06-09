package com.journeycraft.jc.navigation.graph;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.junit.jupiter.api.Assertions.*;

@DisplayName("GraphEdge — road edge with weights, congestion, and transport modes")
class GraphEdgeTest {

    // ─── Effective speed (road type mapping) ───

    @Test
    @DisplayName("effective speed caps at transport max speed")
    void effectiveSpeedCappedByTransport() {
        var edge = GraphEdge.builder().edgeId("e1").distance(1000)
                .roadType("motorway").maxSpeed(120).build();
        // Walking (5 km/h cap) → effective should be 5 * congestion(1.0)
        assertEquals(5.0, edge.getEffectiveSpeed(5.0), 0.01);
    }

    @Test
    @DisplayName("effective speed varies by road type")
    void effectiveSpeedByRoadType() {
        var motorway = GraphEdge.builder().edgeId("e1").distance(1000).roadType("motorway").maxSpeed(120).build();
        var footway = GraphEdge.builder().edgeId("e2").distance(100).roadType("footway").maxSpeed(5).build();
        // Both capped at 40 km/h (default transport)
        assertTrue(motorway.getEffectiveSpeed(120) > footway.getEffectiveSpeed(120));
    }

    @Test
    @DisplayName("effective speed for null road type defaults to 40")
    void nullRoadTypeDefaults40() {
        var edge = GraphEdge.builder().edgeId("e1").distance(1000).build();
        assertEquals(40.0, edge.getEffectiveSpeed(120), 0.01);
    }

    // ─── Congestion ───

    @Test
    @DisplayName("congestion HIGH multiplies speed by 0.4")
    void congestionHigh() {
        var edge = GraphEdge.builder().edgeId("e1").distance(1000)
                .roadType("primary").maxSpeed(60).congestionLevel("HIGH").build();
        // primary=60, capped at 120 → 60, congestion HIGH → 60*0.4=24
        assertEquals(24.0, edge.getEffectiveSpeed(120), 0.01);
    }

    @Test
    @DisplayName("congestion MEDIUM multiplies speed by 0.7")
    void congestionMedium() {
        var edge = GraphEdge.builder().edgeId("e1").distance(1000)
                .roadType("primary").maxSpeed(60).congestionLevel("MEDIUM").build();
        assertEquals(42.0, edge.getEffectiveSpeed(120), 0.01);
    }

    @Test
    @DisplayName("congestion LOW (default) is 1.0 factor")
    void congestionLow() {
        var edge = GraphEdge.builder().edgeId("e1").distance(1000)
                .roadType("primary").maxSpeed(60).build();
        assertEquals(60.0, edge.getEffectiveSpeed(120), 0.01);
    }

    // ─── Weight calculation ───

    @Test
    @DisplayName("getWeight returns distance for DISTANCE strategy")
    void weightDistanceStrategy() {
        var edge = GraphEdge.builder().edgeId("e1").fromNodeId("A").toNodeId("B")
                .distance(500).roadType("primary").maxSpeed(60).build();
        assertEquals(500.0, edge.getWeight("DISTANCE", 40.0), 0.01);
    }

    @Test
    @DisplayName("getWeight returns time for TIME strategy")
    void weightTimeStrategy() {
        // 1000m at 5 km/h (walk) → time = 1000 / (5*1000/3600) = 720 seconds
        var edge = GraphEdge.builder().edgeId("e1").fromNodeId("A").toNodeId("B")
                .distance(1000).roadType("footway").maxSpeed(5).build();
        double time = edge.getWeight("TIME", 5.0);
        assertEquals(720.0, time, 1.0);
    }

    @Test
    @DisplayName("getWeight TIME with higher transport speed gives less time")
    void weightTimeFasterTransport() {
        var edge = GraphEdge.builder().edgeId("e1").fromNodeId("A").toNodeId("B")
                .distance(1000).roadType("primary").maxSpeed(60).build();
        double walkTime = edge.getWeight("TIME", 5.0);
        double bikeTime = edge.getWeight("TIME", 15.0);
        assertTrue(bikeTime < walkTime, "Bike should be faster than walk on same edge");
    }

    @Test
    @DisplayName("travel time seconds calculation")
    void travelTimeSeconds() {
        // 1000m at 40 km/h effective speed
        var edge = GraphEdge.builder().edgeId("e1").distance(1000)
                .roadType("primary").maxSpeed(60).build();
        double time = edge.getTravelTimeSeconds(40.0);
        // speed=40 km/h, effective=min(60,40)=40, speed_ms=11.11, time=1000/11.11=90s
        assertTrue(time > 80 && time < 100);
    }

    @Test
    @DisplayName("default travel time uses 40 km/h")
    void defaultTravelTime() {
        var edge = GraphEdge.builder().edgeId("e1").distance(1000)
                .roadType("primary").maxSpeed(60).build();
        assertTrue(edge.getTravelTimeSeconds() > 0);
    }

    @Test
    @DisplayName("edge with congestion HIGH takes longer than LOW")
    void congestionIncreasesTime() {
        var low = GraphEdge.builder().edgeId("e1").distance(1000)
                .roadType("primary").maxSpeed(60).congestionLevel("LOW").build();
        var high = GraphEdge.builder().edgeId("e2").distance(1000)
                .roadType("primary").maxSpeed(60).congestionLevel("HIGH").build();
        assertTrue(high.getTravelTimeSeconds(40.0) > low.getTravelTimeSeconds(40.0));
    }

    @Test
    @DisplayName("toString contains routing info")
    void toStringFormatted() {
        var edge = GraphEdge.builder().edgeId("e1").fromNodeId("A").toNodeId("B")
                .distance(500).roadType("primary").build();
        String s = edge.toString();
        assertTrue(s.contains("A"));
        assertTrue(s.contains("B"));
        assertTrue(s.contains("500"));
    }
}
