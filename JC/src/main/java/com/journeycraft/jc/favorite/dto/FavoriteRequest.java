package com.journeycraft.jc.favorite.dto;

import jakarta.validation.constraints.NotBlank;

public record FavoriteRequest(@NotBlank String type, @NotBlank String targetId, String targetName) {}
