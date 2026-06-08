package com.journeycraft.jc.user.dto;

public record UserPreferenceUpdateRequest(
        String interestCategories,
        String cuisinePreferences,
        String travelMode) {
}
