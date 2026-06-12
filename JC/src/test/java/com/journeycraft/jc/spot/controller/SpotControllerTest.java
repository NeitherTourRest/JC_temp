package com.journeycraft.jc.spot.controller;

import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.common.exception.ResourceNotFoundException;
import com.journeycraft.jc.spot.dto.SpotDetailResponse;
import com.journeycraft.jc.spot.dto.SpotResponse;
import com.journeycraft.jc.spot.service.SpotService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("SpotController — endpoint delegation tests")
class SpotControllerTest {

    @Mock private SpotService spotService;
    @InjectMocks private SpotController controller;

    @Test
    @DisplayName("searchSpots delegates to service and returns ApiResponse")
    void searchSpots() {
        var page = new PageResponse<>(List.of(
                new SpotResponse(1L, "Great Wall", "scenic", null, null, 40.0, 116.0,
                        40.0, 116.0,
                        100, BigDecimal.valueOf(4.5), null, null, null, null, null)),
                0, 10, 1, 1, false);
        when(spotService.searchSpots(any())).thenReturn(page);

        var response = controller.searchSpots("wall", null, "popularity", 0, 10);
        var body = response.getBody();

        assertNotNull(body);
        assertTrue(body.success());
        assertNotNull(body.data());
        assertEquals("Great Wall", body.data().content().get(0).name());
    }

    @Test
    @DisplayName("recommend returns top K spots via ApiResponse")
    void recommend() {
        var spots = List.of(
                new SpotResponse(1L, "Great Wall", "scenic", null, null, 40.0, 116.0,
                        40.0, 116.0,
                        100, BigDecimal.valueOf(4.5), null, null, null, null, null));
        when(spotService.recommendTopK(anyInt(), any())).thenReturn(spots);

        var response = controller.recommend(5, null);
        var body = response.getBody();

        assertNotNull(body);
        assertTrue(body.success());
        assertEquals(1, body.data().size());
        assertEquals("Great Wall", body.data().get(0).name());
    }

    @Test
    @DisplayName("getSpotDetail returns detail via ApiResponse")
    void getSpotDetail() {
        var detail = new SpotDetailResponse(1L, "Great Wall", "scenic", null, null,
                40.0, 116.0, 40.0, 116.0, 100, BigDecimal.valueOf(4.5), 10, null, null, null,
                List.of(), List.of(), List.of(), "EMPTY");
        when(spotService.getSpotDetail(1L)).thenReturn(detail);

        var response = controller.getSpotDetail(1L);
        var body = response.getBody();

        assertNotNull(body);
        assertTrue(body.success());
        assertEquals("Great Wall", body.data().name());
    }

    @Test
    @DisplayName("getSpotDetail propagates ResourceNotFoundException")
    void getSpotDetailNotFound() {
        when(spotService.getSpotDetail(99L)).thenThrow(new ResourceNotFoundException("Spot", 99L));

        assertThrows(ResourceNotFoundException.class, () -> controller.getSpotDetail(99L));
    }
}
