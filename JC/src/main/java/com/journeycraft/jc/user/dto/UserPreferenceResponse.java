package com.journeycraft.jc.user.dto;

import com.journeycraft.jc.user.entity.UserPreference;

public record UserPreferenceResponse(
        Long id,
        String interestCategories,
        String cuisinePreferences,
        String travelMode) {

    public static UserPreferenceResponse from(UserPreference pref) {
        return new UserPreferenceResponse(
                pref.getId(),
                pref.getInterestCategories(),
                pref.getCuisinePreferences(),
                pref.getTravelMode());
    }
}
