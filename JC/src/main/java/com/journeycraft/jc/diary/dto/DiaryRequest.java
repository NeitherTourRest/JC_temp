package com.journeycraft.jc.diary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record DiaryRequest(
        @NotBlank(message = "Title is required")
        @Size(max = 200, message = "Title must be under 200 characters")
        String title,

        @NotBlank(message = "Content is required")
        String content,

        String destination,
        Long spotId,
        List<String> images,
        DiaryVideoMetaRequest videoMeta,
        String musicUrl,
        Boolean isPublic) {
}
