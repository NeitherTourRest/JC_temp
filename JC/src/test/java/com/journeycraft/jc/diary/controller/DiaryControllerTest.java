package com.journeycraft.jc.diary.controller;

import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.common.exception.BadRequestException;
import com.journeycraft.jc.diary.dto.DiaryRequest;
import com.journeycraft.jc.diary.dto.DiaryResponse;
import com.journeycraft.jc.diary.service.DiaryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("DiaryController — endpoint delegation tests")
class DiaryControllerTest {

    @Mock private DiaryService diaryService;
    @InjectMocks private DiaryController controller;

    private final DiaryResponse sampleDiary = new DiaryResponse("d1", 1L, "My Trip", "Great!", null, "Beijing",
            null, null, null, null, 50, 4.0, 5, true, null, null, null, null, null);

    @Test
    @DisplayName("listDiaries returns paginated public diaries")
    void listDiaries() {
        var page = new PageResponse<>(List.of(sampleDiary), 0, 10, 1, 1, false);
        when(diaryService.listDiaries(anyInt(), anyInt(), any(), any())).thenReturn(page);

        var response = controller.listDiaries(0, 10, "popularity", null);
        var body = response.getBody();
        assertNotNull(body);
        assertTrue(body.success());
        assertEquals("My Trip", body.data().content().get(0).title());
    }

    @Test
    @DisplayName("getDiary returns diary by id")
    void getDiary() {
        when(diaryService.getDiary("d1")).thenReturn(sampleDiary);

        var response = controller.getDiary("d1");
        var body = response.getBody();
        assertNotNull(body);
        assertEquals("My Trip", body.data().title());
    }

    @Test
    @DisplayName("searchDiaries searches by keyword")
    void searchDiaries() {
        var page = new PageResponse<>(List.<DiaryResponse>of(), 0, 10, 0, 0, false);
        when(diaryService.searchDiaries(eq("trip"), anyInt(), anyInt())).thenReturn(page);

        var response = controller.searchDiaries("trip", 0, 10);
        assertNotNull(response.getBody());
        assertTrue(response.getBody().success());
    }

    @Test
    @DisplayName("createDiary returns created status")
    void createDiary() {
        when(diaryService.createDiary(any())).thenReturn(sampleDiary);

        var request = new DiaryRequest("My Trip", "Great!", null, "Beijing", null, null, null, null, true);
        var response = controller.createDiary(request);
        var body = response.getBody();
        assertNotNull(body);
        assertEquals(201, response.getStatusCode().value());
        assertTrue(body.success());
    }

    @Test
    @DisplayName("getDiary throws ResourceNotFoundException for missing diary")
    void getDiaryNotFound() {
        when(diaryService.getDiary("missing"))
                .thenThrow(new com.journeycraft.jc.common.exception.ResourceNotFoundException("Diary", "missing"));

        assertThrows(com.journeycraft.jc.common.exception.ResourceNotFoundException.class,
                () -> controller.getDiary("missing"));
    }
}
