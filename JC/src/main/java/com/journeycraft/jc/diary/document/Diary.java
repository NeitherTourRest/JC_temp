package com.journeycraft.jc.diary.document;

import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "diaries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Diary {

    @Id
    private String id;

    @Indexed
    private Long userId;

    private String title;

    private String content;

    /** Rich HTML content with inline images/videos and formatting */
    private String contentHtml;

    /** Compressed contentHtml (raw Deflate, no GZIP header) */
    private byte[] contentCompressed;

    /** Original size in bytes before compression */
    private Long originalSize;

    /** Compressed size in bytes */
    private Long compressedSize;

    private String destination;

    @Indexed
    private Long spotId;

    @Builder.Default
    private List<String> images = List.of();

    private VideoMeta videoMeta;

    private String musicUrl; // AI-generated music URL

    @Builder.Default
    private Integer popularity = 0;

    @Builder.Default
    private Double avgRating = 0.0;

    @Builder.Default
    private Integer ratingCount = 0;

    @Builder.Default
    private Boolean isPublic = true;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class VideoMeta {
        private String url;
        private Long duration;
        private String thumbnail;
    }
}
