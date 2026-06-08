package com.journeycraft.jc.diary.document;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "diary_ratings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DiaryRating {

    @Id
    private String id;

    @Indexed
    private String diaryId;

    private Long userId;

    private Integer rating;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
