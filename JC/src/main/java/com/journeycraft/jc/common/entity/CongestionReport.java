package com.journeycraft.jc.common.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "congestion_reports", uniqueConstraints = {
    @UniqueConstraint(name = "uk_congestion_user_target", columnNames = {"targetType", "targetId", "userId"})
})
@Getter @Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class CongestionReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "target_type", nullable = false, length = 10)
    private String targetType; // "SPOT" or "FOOD"

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false, length = 20)
    private String level; // OVERFLOWING, CROWDED, MODERATE, SPARSE, EMPTY

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
