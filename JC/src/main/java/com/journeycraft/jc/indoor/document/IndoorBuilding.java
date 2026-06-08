package com.journeycraft.jc.indoor.document;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@Document(collection = "indoor_navigation")
public class IndoorBuilding {
    
    @Id
    private String id;
    
    private String buildingId;
    private String buildingName;
    private String campus;
    private List<String> floors;
    private java.util.Map<String, String> floorPlans;
    private List<IndoorNode> nodes;
    private List<IndoorEdge> edges;
    private List<CrossFloorEdge> crossFloorEdges;
    
    @Data
    public static class IndoorNode {
        private String id;
        private String floor;
        private int x;
        private int y;
        private String name;
        private String type; // ENTRANCE, CLASSROOM, LAB, TOILET, ELEVATOR, STAIRS, LOBBY, CORRIDOR, OFFICE
    }
    
    @Data
    public static class IndoorEdge {
        private String from;
        private String to;
        private double dist;
        private String floor;
    }
    
    @Data
    public static class CrossFloorEdge {
        private String from;
        private String to;
        private String type; // ELEVATOR, STAIRS
        private double dist;
    }
}
