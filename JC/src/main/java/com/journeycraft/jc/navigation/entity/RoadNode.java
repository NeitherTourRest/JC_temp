package com.journeycraft.jc.navigation.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "road_nodes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RoadNode {
    @Id @Column(name = "node_id", length = 20)
    private String nodeId;
    @Column(nullable = false)
    private Double latitude;
    @Column(nullable = false)
    private Double longitude;
}
