package com.journeycraft.jc.link.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity @Table(name = "travel_service_links")
@Getter @Setter @NoArgsConstructor(access = AccessLevel.PROTECTED) @AllArgsConstructor @Builder
public class TravelServiceLink {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "spot_id", nullable = false) private Long spotId;
    @Column(nullable = false, length = 50) private String type;
    @Column(nullable = false, length = 200) private String name;
    @Column(nullable = false, length = 500) private String url;
    @Column(length = 50) private String icon;
    @Column(name = "created_at", updatable = false) private LocalDateTime createdAt;
    @PrePersist protected void onCreate() { createdAt = LocalDateTime.now(); }
}
