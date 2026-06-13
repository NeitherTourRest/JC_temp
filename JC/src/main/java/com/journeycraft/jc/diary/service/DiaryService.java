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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
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

    private static final Logger log = LoggerFactory.getLogger(DiaryService.class);

    @Transactional
    public DiaryResponse createDiary(DiaryRequest request) {
        var user = getCurrentUser();

        var diaryBuilder = Diary.builder()
                .userId(user.getId())
                .title(request.title())
                .content(request.content())
                .contentHtml(request.contentHtml())
                .destination(request.destination())
                .spotId(request.spotId())
                .isPublic(request.isPublic() != null ? request.isPublic() : true);

        // Compress contentHtml if present
        if (request.contentHtml() != null && !request.contentHtml().isBlank()) {
            try {
                var cr = DiaryCompressor.compress(request.contentHtml());
                diaryBuilder.contentCompressed(cr.compressedData());
                diaryBuilder.originalSize((long) cr.originalSize());
                diaryBuilder.compressedSize((long) cr.compressedSize());
                log.info("Diary compression: {} bytes -> {} bytes (ratio: {}x, level {})",
                    cr.originalSize(), cr.compressedSize(),
                    String.format("%.2f", cr.ratio()), cr.level());
            } catch (Exception e) {
                log.warn("Failed to compress diary content, storing uncompressed: {}", e.getMessage());
            }
        }

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

        // Decompress contentHtml if stored compressed
        decompressDiary(diary);

        diaryRepository.save(diary);
        return DiaryResponse.from(diary);
    }

    /**
     * Decompress contentCompressed into contentHtml.
     * If contentCompressed is null but contentHtml exists, lazily compress for next read.
     */
    private void decompressDiary(Diary diary) {
        byte[] compressed = diary.getContentCompressed();
        if (compressed != null && compressed.length > 0 && diary.getContentHtml() == null) {
            try {
                int originalSize = diary.getOriginalSize() != null ? diary.getOriginalSize().intValue() : 0;
                String html = DiaryCompressor.decompress(compressed, originalSize);
                diary.setContentHtml(html);
            } catch (Exception e) {
                log.error("Failed to decompress diary {}: {}", diary.getId(), e.getMessage());
            }
        }

        // Lazy migration: compress existing uncompressed contentHtml for next read
        if (diary.getContentCompressed() == null
                && diary.getContentHtml() != null && !diary.getContentHtml().isBlank()) {
            try {
                var cr = DiaryCompressor.compress(diary.getContentHtml());
                diary.setContentCompressed(cr.compressedData());
                diary.setOriginalSize((long) cr.originalSize());
                diary.setCompressedSize((long) cr.compressedSize());
                log.info("Lazy compression of diary {}: {} bytes -> {} bytes (ratio: {}x)",
                    diary.getId(), cr.originalSize(), cr.compressedSize(),
                    String.format("%.2f", cr.ratio()));
            } catch (Exception e) {
                log.warn("Failed to lazily compress diary {}: {}", diary.getId(), e.getMessage());
            }
        }
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
        diary.setContentHtml(request.contentHtml());
        diary.setDestination(request.destination());
        diary.setSpotId(request.spotId());
        if (request.images() != null) diary.setImages(request.images());
        if (request.isPublic() != null) diary.setIsPublic(request.isPublic());

        // Re-compress if contentHtml changed
        if (request.contentHtml() != null && !request.contentHtml().isBlank()) {
            try {
                var cr = DiaryCompressor.compress(request.contentHtml());
                diary.setContentCompressed(cr.compressedData());
                diary.setOriginalSize((long) cr.originalSize());
                diary.setCompressedSize((long) cr.compressedSize());
                log.info("Re-compressed diary {}: {} bytes -> {} bytes (ratio: {}x)",
                    id, cr.originalSize(), cr.compressedSize(),
                    String.format("%.2f", cr.ratio()));
            } catch (Exception e) {
                log.warn("Failed to re-compress diary {}: {}", id, e.getMessage());
            }
        }

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
        var diaryPage = keyword != null && !keyword.isBlank()
                ? diaryRepository.searchByFullText(keyword, pageable)
                : diaryRepository.findByIsPublicTrue(pageable);
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
