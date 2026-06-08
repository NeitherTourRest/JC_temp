package com.journeycraft.jc.diary.service;

import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.common.exception.BadRequestException;
import com.journeycraft.jc.common.exception.ResourceNotFoundException;
import com.journeycraft.jc.diary.document.Diary;
import com.journeycraft.jc.diary.document.DiaryRating;
import com.journeycraft.jc.diary.dto.*;
import com.journeycraft.jc.diary.repository.DiaryRatingRepository;
import com.journeycraft.jc.diary.repository.DiaryRepository;
import com.journeycraft.jc.user.entity.User;
import com.journeycraft.jc.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class DiaryService {

    private final DiaryRepository diaryRepository;
    private final DiaryRatingRepository diaryRatingRepository;
    private final UserRepository userRepository;

    @Transactional
    public DiaryResponse createDiary(DiaryRequest request) {
        var user = getCurrentUser();

        var diaryBuilder = Diary.builder()
                .userId(user.getId())
                .title(request.title())
                .content(request.content())
                .destination(request.destination())
                .spotId(request.spotId())
                .isPublic(request.isPublic() != null ? request.isPublic() : true);

        if (request.images() != null) {
            diaryBuilder.images(request.images());
        }

        if (request.videoMeta() != null) {
            diaryBuilder.videoMeta(Diary.VideoMeta.builder()
                    .url(request.videoMeta().url())
                    .duration(request.videoMeta().duration())
                    .thumbnail(request.videoMeta().thumbnail())
                    .build());
        }

        if (request.musicUrl() != null && !request.musicUrl().isBlank()) {
            diaryBuilder.musicUrl(request.musicUrl());
        }

        var diary = diaryRepository.save(diaryBuilder.build());
        return DiaryResponse.from(diary);
    }

    @Transactional(readOnly = true)
    public PageResponse<DiaryResponse> listDiaries(int page, int size, String sortBy, String destination) {
        var pageable = PageRequest.of(page, size);

        var diaryPage = (destination != null && !destination.isBlank())
                ? diaryRepository.findByDestinationContainingIgnoreCaseAndIsPublicTrue(destination, pageable)
                : diaryRepository.findByIsPublicTrue(pageable);

        var content = diaryPage.getContent().stream().map(DiaryResponse::from).toList();
        return PageResponse.of(content, diaryPage.getNumber(), diaryPage.getSize(), diaryPage.getTotalElements());
    }

    @Transactional(readOnly = true)
    public DiaryResponse getDiary(String id) {
        var diary = diaryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Diary", id));
        diary.setPopularity(diary.getPopularity() + 1);
        diaryRepository.save(diary);
        return DiaryResponse.from(diary);
    }

    @Transactional
    public DiaryResponse updateDiary(String id, DiaryRequest request) {
        var diary = diaryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Diary", id));

        var user = getCurrentUser();
        if (!diary.getUserId().equals(user.getId())) {
            throw new BadRequestException("You can only edit your own diaries");
        }

        diary.setTitle(request.title());
        diary.setContent(request.content());
        diary.setDestination(request.destination());
        diary.setSpotId(request.spotId());
        if (request.images() != null) diary.setImages(request.images());
        if (request.isPublic() != null) diary.setIsPublic(request.isPublic());

        if (request.videoMeta() != null) {
            diary.setVideoMeta(Diary.VideoMeta.builder()
                    .url(request.videoMeta().url())
                    .duration(request.videoMeta().duration())
                    .thumbnail(request.videoMeta().thumbnail())
                    .build());
        }

        if (request.musicUrl() != null && !request.musicUrl().isBlank()) {
            diary.setMusicUrl(request.musicUrl());
        }

        return DiaryResponse.from(diaryRepository.save(diary));
    }

    @Transactional
    public void deleteDiary(String id) {
        var diary = diaryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Diary", id));
        var user = getCurrentUser();
        if (!diary.getUserId().equals(user.getId())) {
            throw new BadRequestException("You can only delete your own diaries");
        }
        diaryRatingRepository.deleteAll(diaryRatingRepository.findByDiaryId(id));
        diaryRepository.delete(diary);
    }

    @Transactional
    public DiaryResponse rateDiary(String diaryId, int rating) {
        if (rating < 1 || rating > 5) {
            throw new BadRequestException("Rating must be between 1 and 5");
        }

        var diary = diaryRepository.findById(diaryId)
                .orElseThrow(() -> new ResourceNotFoundException("Diary", diaryId));

        var user = getCurrentUser();
        var existingRating = diaryRatingRepository.findByDiaryIdAndUserId(diaryId, user.getId());

        if (existingRating.isPresent()) {
            existingRating.get().setRating(rating);
            diaryRatingRepository.save(existingRating.get());
        } else {
            diaryRatingRepository.save(DiaryRating.builder()
                    .diaryId(diaryId)
                    .userId(user.getId())
                    .rating(rating)
                    .build());
            diary.setRatingCount(diary.getRatingCount() + 1);
        }

        // Recalculate average rating
        var ratings = diaryRatingRepository.findByDiaryId(diaryId);
        double avg = ratings.stream().mapToInt(DiaryRating::getRating).average().orElse(0.0);
        diary.setAvgRating(Math.round(avg * 100.0) / 100.0);
        diaryRepository.save(diary);

        return DiaryResponse.from(diary);
    }

    @Transactional(readOnly = true)
    public PageResponse<DiaryResponse> searchDiaries(String keyword, int page, int size) {
        var pageable = PageRequest.of(page, size);
        var diaryPage = diaryRepository.findByTitleContainingIgnoreCaseAndIsPublicTrue(keyword, pageable);
        var content = diaryPage.getContent().stream().map(DiaryResponse::from).toList();
        return PageResponse.of(content, diaryPage.getNumber(), diaryPage.getSize(), diaryPage.getTotalElements());
    }

    @Transactional(readOnly = true)
    public PageResponse<DiaryResponse> getMyDiaries(int page, int size) {
        var user = getCurrentUser();
        var pageable = PageRequest.of(page, size);
        var diaryPage = diaryRepository.findByUserId(user.getId(), pageable);
        var content = diaryPage.getContent().stream().map(DiaryResponse::from).toList();
        return PageResponse.of(content, diaryPage.getNumber(), diaryPage.getSize(), diaryPage.getTotalElements());
    }

    private User getCurrentUser() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }
}
