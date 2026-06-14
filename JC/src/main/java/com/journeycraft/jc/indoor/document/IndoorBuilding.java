package com.journeycraft.jc.indoor.document;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AccessLevel;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.List;
import java.util.Map;

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
        @JsonIgnore
        @Field("id")
        @Getter(AccessLevel.NONE)
        @Setter(AccessLevel.NONE)
        private String persistedId;
        private String floor;
        private int x;
        private int y;
        private String name;
        private String type; // ENTRANCE, CLASSROOM, LAB, TOILET, ELEVATOR, STAIRS, LOBBY, CORRIDOR, OFFICE
        private String wing;
        private String zone;
        private String roomCategory;
        private String anchorNodeId;
        private String doorNodeId;
        private List<String> aliases;
        private Boolean accessible;
        private Map<String, Object> meta;

        @JsonProperty("id")
        public String getId() {
            return persistedId;
        }

        @JsonProperty("id")
        public void setId(String id) {
            this.persistedId = id;
        }
    }
    
    @Data
    public static class IndoorEdge {
        private String from;
        private String to;
        private double dist;
        private String floor;
        private String type;
        private Boolean accessible;
    }
    
    @Data
    public static class CrossFloorEdge {
        private String from;
        private String to;
        private String type; // ELEVATOR, STAIRS
        private double dist;
    }
}
