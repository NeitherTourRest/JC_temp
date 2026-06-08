package com.journeycraft.jc.navigation.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "road_edges")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RoadEdge {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "edge_id", length = 40)
    private String edgeId;
    @Column(name = "from_node_id", length = 20, nullable = false)
    private String fromNodeId;
    @Column(name = "to_node_id", length = 20, nullable = false)
    private String toNodeId;
    private Double distance;
    @Column(name = "road_type", length = 30)
    private String roadType;
    @Column(length = 200)
    private String name;
    @Column(name = "is_one_way")
    private Boolean isOneWay;
    @Column(name = "max_speed")
    private Double maxSpeed;
    @Column(name = "congestion_level", length = 10)
    @Builder.Default
    private String congestionLevel = "LOW";
}
