package com.journeycraft.jc.diary.repository;

import com.journeycraft.jc.diary.document.DiaryRating;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DiaryRatingRepository extends MongoRepository<DiaryRating, String> {

    java.util.List<DiaryRating> findByDiaryId(String diaryId);

    Optional<DiaryRating> findByDiaryIdAndUserId(String diaryId, Long userId);

    void deleteByDiaryIdAndUserId(String diaryId, Long userId);
}
