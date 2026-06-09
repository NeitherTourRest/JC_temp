package com.journeycraft.jc.diary.service;

import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.common.exception.BadRequestException;
import com.journeycraft.jc.common.exception.ResourceNotFoundException;
import com.journeycraft.jc.diary.document.Diary;
import com.journeycraft.jc.diary.document.DiaryRating;
import com.journeycraft.jc.diary.dto.DiaryRequest;
import com.journeycraft.jc.diary.repository.DiaryRatingRepository;
import com.journeycraft.jc.diary.repository.DiaryRepository;
import com.journeycraft.jc.user.entity.User;
import com.journeycraft.jc.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("DiaryService — CRUD, search, rating")
class DiaryServiceTest {

    @Mock private DiaryRepository diaryRepository;
    @Mock private DiaryRatingRepository diaryRatingRepository;
    @Mock private UserRepository userRepository;
    @Mock private SecurityContext securityContext;
    @Mock private Authentication authentication;

    private DiaryService diaryService;

    private User user;
    private Diary diary;

    @BeforeEach
    void setUp() {
        diaryService = new DiaryService(diaryRepository, diaryRatingRepository, userRepository);

        user = User.builder().id(1L).username("testuser").build();
        diary = Diary.builder().id("d1").userId(1L).title("My Trip")
                .content("Had a great time!").destination("Beijing")
                .isPublic(true).popularity(50).avgRating(4.0).build();
    }

    private void mockAuthUser() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("testuser");
        SecurityContextHolder.setContext(securityContext);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
    }

    @Test
    @DisplayName("createDiary saves and returns diary")
    void createDiary() {
        mockAuthUser();
        when(diaryRepository.save(any(Diary.class))).thenReturn(diary);

        var request = new DiaryRequest("My Trip", "Had a great time!", "Beijing", null, null, null, null, true);
        var result = diaryService.createDiary(request);

        assertEquals("My Trip", result.title());
        verify(diaryRepository).save(any(Diary.class));
    }

    @Test
    @DisplayName("listDiaries returns all public diaries")
    void listDiaries() {
        when(diaryRepository.findByIsPublicTrue(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(diary)));

        var result = diaryService.listDiaries(0, 10, null, null);
        assertEquals(1, result.content().size());
    }

    @Test
    @DisplayName("listDiaries filters by destination")
    void listDiariesByDestination() {
        when(diaryRepository.findByDestinationContainingIgnoreCaseAndIsPublicTrue(eq("Beijing"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(diary)));

        var result = diaryService.listDiaries(0, 10, null, "Beijing");
        assertEquals(1, result.content().size());
        verify(diaryRepository).findByDestinationContainingIgnoreCaseAndIsPublicTrue(anyString(), any(PageRequest.class));
    }

    @Test
    @DisplayName("getDiary increments popularity")
    void getDiary() {
        when(diaryRepository.findById("d1")).thenReturn(Optional.of(diary));
        when(diaryRepository.save(any(Diary.class))).thenReturn(diary);

        var result = diaryService.getDiary("d1");
        assertEquals("My Trip", result.title());
        assertEquals(51, diary.getPopularity()); // 50 + 1
    }

    @Test
    @DisplayName("getDiary throws on missing diary")
    void getDiaryNotFound() {
        when(diaryRepository.findById("missing")).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> diaryService.getDiary("missing"));
    }

    @Test
    @DisplayName("updateDiary by owner succeeds")
    void updateDiaryOwn() {
        mockAuthUser();
        when(diaryRepository.findById("d1")).thenReturn(Optional.of(diary));
        when(diaryRepository.save(any(Diary.class))).thenReturn(diary);

        var request = new DiaryRequest("Updated", "Updated content", null, null, null, null, null, true);
        var result = diaryService.updateDiary("d1", request);

        assertEquals("Updated", result.title());
        verify(diaryRepository).save(any(Diary.class));
    }

    @Test
    @DisplayName("rateDiary saves rating and recalculates average")
    void rateDiary() {
        mockAuthUser();
        when(diaryRepository.findById("d1")).thenReturn(Optional.of(diary));
        when(diaryRatingRepository.findByDiaryIdAndUserId("d1", 1L)).thenReturn(Optional.empty());
        when(diaryRatingRepository.save(any(DiaryRating.class))).thenAnswer(i -> i.getArgument(0));
        when(diaryRatingRepository.findByDiaryId("d1")).thenReturn(List.of(
                DiaryRating.builder().rating(5).build(),
                DiaryRating.builder().rating(3).build()
        ));

        var result = diaryService.rateDiary("d1", 4);
        assertNotNull(result);
        assertEquals("My Trip", result.title());
    }

    @Test
    @DisplayName("rateDiary rejects invalid rating values")
    void rateDiaryInvalid() {
        mockAuthUser();
        when(diaryRepository.findById("d1")).thenReturn(Optional.of(diary));

        assertThrows(BadRequestException.class, () -> diaryService.rateDiary("d1", 0));
        assertThrows(BadRequestException.class, () -> diaryService.rateDiary("d1", 6));
    }

    @Test
    @DisplayName("deleteDiary by owner succeeds")
    void deleteDiaryOwn() {
        mockAuthUser();
        when(diaryRepository.findById("d1")).thenReturn(Optional.of(diary));

        diaryService.deleteDiary("d1");
        verify(diaryRepository).delete(diary);
    }

    @Test
    @DisplayName("searchDiaries searches by title")
    void searchDiaries() {
        when(diaryRepository.findByTitleContainingIgnoreCaseAndIsPublicTrue(eq("Trip"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(diary)));

        var result = diaryService.searchDiaries("Trip", 0, 10);
        assertEquals(1, result.content().size());
    }
}
