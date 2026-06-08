package com.journeycraft.jc.diary.dto;

public record DiaryVideoMetaRequest(
        String url,
        Long duration,
        String thumbnail) {
}
