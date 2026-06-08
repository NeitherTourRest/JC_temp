package com.journeycraft.jc.user.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_preferences")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class UserPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "interest_categories", length = 500)
    private String interestCategories;

    @Column(name = "cuisine_preferences", length = 500)
    private String cuisinePreferences;

    @Column(name = "travel_mode", length = 50)
    @Builder.Default
    private String travelMode = "WALK";
}
