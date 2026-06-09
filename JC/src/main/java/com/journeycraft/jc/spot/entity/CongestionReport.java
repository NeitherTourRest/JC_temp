package com.journeycraft.jc.spot.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Tracks user-reported congestion levels for spots.
 * Each report has a timestamp; newer reports are weighted higher
 * when computing the aggregated congestion level.
 */
@Entity
@Table(name = "congestion_reports", indexes = {
    @Index(name = "idx_congestion_spot", columnList = "spotId"),
    @Index(name = "idx_congestion_time", columnList = "createdAt")
})
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class CongestionReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long spotId;

    @Column(nullable = false)
    private Long userId;

    /** OVERFLOWING, CROWDED, MODERATE, SPARSE, EMPTY */
    @Column(nullable = false, length = 20)
    private String level;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
