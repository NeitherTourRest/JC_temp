package com.journeycraft.jc.indoor.service;

import com.journeycraft.jc.indoor.document.IndoorBuilding;
import com.journeycraft.jc.indoor.repository.IndoorBuildingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("IndoorNavigationService — building indoor pathfinding")
class IndoorNavigationServiceTest {

    @Mock private IndoorBuildingRepository buildingRepository;
    private IndoorNavigationService service;
    private IndoorBuilding building;

    @BeforeEach
    void setUp() {
        service = new IndoorNavigationService(buildingRepository);

        // Use no-arg constructors + setters (Lombok @Data)
        var n1 = new IndoorBuilding.IndoorNode();
        n1.setId("n1"); n1.setName("Entrance"); n1.setFloor("F1");
        n1.setType("entrance"); n1.setX(0); n1.setY(0);

        var n2 = new IndoorBuilding.IndoorNode();
        n2.setId("n2"); n2.setName("Hall"); n2.setFloor("F1");
        n2.setType("CORRIDOR"); n2.setWing("N"); n2.setZone("west"); n2.setX(10); n2.setY(0);

        var n3 = new IndoorBuilding.IndoorNode();
        n3.setId("n3"); n3.setName("Elevator_F1"); n3.setFloor("F1");
        n3.setType("ELEVATOR"); n3.setX(20); n3.setY(0);

        var n4 = new IndoorBuilding.IndoorNode();
        n4.setId("n4"); n4.setName("Elevator_F2"); n4.setFloor("F2");
        n4.setType("ELEVATOR"); n4.setX(20); n4.setY(0);

        var n5 = new IndoorBuilding.IndoorNode();
        n5.setId("n5"); n5.setName("Room 201"); n5.setFloor("F2");
        n5.setType("CLASSROOM"); n5.setX(30); n5.setY(0);

        var e12 = new IndoorBuilding.IndoorEdge();
        e12.setFrom("n1"); e12.setTo("n2"); e12.setDist(10);
        var e23 = new IndoorBuilding.IndoorEdge();
        e23.setFrom("n2"); e23.setTo("n3"); e23.setDist(10);
        var e45 = new IndoorBuilding.IndoorEdge();
        e45.setFrom("n4"); e45.setTo("n5"); e45.setDist(10);

        var cf = new IndoorBuilding.CrossFloorEdge();
        cf.setFrom("n3"); cf.setTo("n4"); cf.setDist(5); cf.setType("stairs");

        building = new IndoorBuilding();
        building.setBuildingId("test_building");
        building.setBuildingName("Test Building");
        building.setNodes(List.of(n1, n2, n3, n4, n5));
        building.setEdges(List.of(e12, e23, e45));
        building.setCrossFloorEdges(List.of(cf));
        building.setFloorPlans(Map.of("F1", "f1.png", "F2", "f2.png"));
    }

    @Test
    @DisplayName("findPath returns path for single-floor navigation")
    void singleFloorPath() {
        when(buildingRepository.findByBuildingId("test_building")).thenReturn(Optional.of(building));

        var result = service.findPath("test_building", "n1", "n3");
        assertTrue(result.success);
        assertFalse(result.steps.isEmpty());
        assertEquals(List.of("n1", "n2", "n3"), result.nodePath);
        assertFalse(result.textInstructions.isEmpty());
        assertTrue(result.totalDistance > 0);
    }

    @Test
    @DisplayName("findPath returns path for cross-floor navigation")
    void crossFloorPath() {
        when(buildingRepository.findByBuildingId("test_building")).thenReturn(Optional.of(building));

        var result = service.findPath("test_building", "n1", "n4");
        assertTrue(result.success);
        assertFalse(result.steps.isEmpty());

        boolean hasCrossFloor = result.steps.stream().anyMatch(s -> s.crossFloor);
        assertTrue(hasCrossFloor, "Cross-floor path should include at least one cross-floor step");
        assertTrue(result.textInstructions.stream().anyMatch(instruction -> instruction.contains("乘电梯")));
    }

    @Test
    @DisplayName("findPath returns error for unknown building")
    void unknownBuilding() {
        when(buildingRepository.findByBuildingId("unknown")).thenReturn(Optional.empty());

        var result = service.findPath("unknown", "n1", "n5");
        assertFalse(result.success);
        assertEquals("Building not found", result.error);
    }

    @Test
    @DisplayName("findPath with start=end returns a no-op navigation result")
    void startEqualsEnd() {
        when(buildingRepository.findByBuildingId("test_building")).thenReturn(Optional.of(building));

        var result = service.findPath("test_building", "n1", "n1");
        assertTrue(result.success);
        assertEquals(0, result.totalDistance);
        assertEquals(List.of("n1"), result.nodePath);
        assertEquals(1, result.textInstructions.size());
    }

    @Test
    @DisplayName("getBuildingMetadata returns structure info")
    void getBuildingMetadata() {
        when(buildingRepository.findByBuildingId("test_building")).thenReturn(Optional.of(building));

        var meta = service.getBuildingMetadata("test_building");
        assertNotNull(meta);
        assertEquals(5, meta.nodes.size());
        assertEquals(3, meta.edges.size());
        assertEquals(1, meta.crossFloorEdges.size());
        assertEquals(2, meta.floorPlans.size());
    }
}
