package com.journeycraft.jc.food.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "foods", indexes = {
        @Index(name = "idx_cuisine", columnList = "cuisine"),
        @Index(name = "idx_food_popularity", columnList = "popularity"),
        @Index(name = "idx_food_rating", columnList = "avgRating"),
        @Index(name = "idx_food_location", columnList = "latitude,longitude")
})
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Food {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 50)
    private String cuisine;

    @Column(name = "restaurant_name", length = 200)
    private String restaurantName;

    @Column(name = "spot_id")
    private Long spotId;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "price_range", length = 50)
    private String priceRange;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Builder.Default
    private Integer popularity = 0;

    @Column(precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal avgRating = BigDecimal.ZERO;

    @Builder.Default
    private Integer ratingCount = 0;

    @Column(name = "congestion_level", length = 20)
    private String congestionLevel;

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
