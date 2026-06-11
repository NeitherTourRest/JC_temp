package com.journeycraft.jc.diary.repository;

import com.journeycraft.jc.diary.document.Diary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DiaryRepository extends MongoRepository<Diary, String> {

    Page<Diary> findByIsPublicTrue(Pageable pageable);

    Page<Diary> findByUserId(Long userId, Pageable pageable);

    Page<Diary> findByDestinationContainingIgnoreCase(String destination, Pageable pageable);

    Page<Diary> findBySpotId(Long spotId, Pageable pageable);

    List<Diary> findByIsPublicTrueOrderByPopularityDesc(Pageable pageable);

    List<Diary> findByIsPublicTrueOrderByAvgRatingDesc(Pageable pageable);

    Page<Diary> findByTitleContainingIgnoreCaseAndIsPublicTrue(String title, Pageable pageable);

    Page<Diary> findByDestinationContainingIgnoreCaseAndIsPublicTrue(String destination, Pageable pageable);

    // Fulltext search across title, content, and destination
    @org.springframework.data.mongodb.repository.Query("{ 'isPublic': true, $or: [ { 'title': { $regex: ?0, $options: 'i' } }, { 'content': { $regex: ?0, $options: 'i' } }, { 'destination': { $regex: ?0, $options: 'i' } } ] }")
    Page<Diary> searchFulltext(String keyword, Pageable pageable);

    @org.springframework.data.mongodb.repository.Query("{ $text: { $search: ?0 } }")
    Page<Diary> searchByFullText(String keyword, Pageable pageable);
}
