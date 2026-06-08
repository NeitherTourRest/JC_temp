package com.journeycraft.jc.diary.dto;

import com.journeycraft.jc.diary.document.Diary;
import java.time.LocalDateTime;
import java.util.List;

public record DiaryResponse(
        String id,
        Long userId,
        String title,
        String content,
        String destination,
        Long spotId,
        List<String> images,
        DiaryVideoMetaResponse videoMeta,
        String musicUrl,
        Integer popularity,
        Double avgRating,
        Integer ratingCount,
        Boolean isPublic,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public static DiaryResponse from(Diary diary) {
        DiaryVideoMetaResponse videoMetaResp = null;
        if (diary.getVideoMeta() != null) {
            videoMetaResp = new DiaryVideoMetaResponse(
                    diary.getVideoMeta().getUrl(),
                    diary.getVideoMeta().getDuration(),
                    diary.getVideoMeta().getThumbnail());
        }
        return new DiaryResponse(
                diary.getId(), diary.getUserId(), diary.getTitle(),
                diary.getContent(), diary.getDestination(), diary.getSpotId(),
                diary.getImages(), videoMetaResp, diary.getMusicUrl(),
                diary.getPopularity(), diary.getAvgRating(), diary.getRatingCount(),
                diary.getIsPublic(), diary.getCreatedAt(), diary.getUpdatedAt());
    }
}
