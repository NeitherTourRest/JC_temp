package com.journeycraft.jc.favorite.dto;

import com.journeycraft.jc.favorite.entity.Favorite;
import java.time.LocalDateTime;

public record FavoriteResponse(Long id, String type, String targetId, String targetName, LocalDateTime createdAt) {
    public static FavoriteResponse from(Favorite f) {
        return new FavoriteResponse(f.getId(), f.getType(), f.getTargetId(), f.getTargetName(), f.getCreatedAt());
    }
}
