package com.journeycraft.jc.shop.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 餐馆/店铺（从高德 API 导入的真实餐馆 POI 数据）。
 */
@Entity
@Table(name = "shops", indexes = {
        @Index(name = "idx_shop_cuisine", columnList = "cuisine"),
        @Index(name = "idx_shop_popularity", columnList = "popularity"),
        @Index(name = "idx_shop_rating", columnList = "avg_rating"),
        @Index(name = "idx_shop_location", columnList = "latitude,longitude")
})
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Shop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 500)
    private String address;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(length = 50)
    private String cuisine;

    @Column(name = "spot_id")
    private Long spotId;

    @Column(name = "avg_rating", precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal avgRating = BigDecimal.ZERO;

    @Column(name = "rating_count")
    @Builder.Default
    private Integer ratingCount = 0;

    @Builder.Default
    private Integer popularity = 0;

    @Column(name = "congestion_level", length = 20)
    @Builder.Default
    private String congestionLevel = "EMPTY";

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
