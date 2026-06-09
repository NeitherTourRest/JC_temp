package com.journeycraft.jc.itinerary.controller;

import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.common.exception.ResourceNotFoundException;
import com.journeycraft.jc.itinerary.dto.ItineraryRequest;
import com.journeycraft.jc.itinerary.dto.ItineraryResponse;
import com.journeycraft.jc.itinerary.service.ItineraryService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ItineraryController — CRUD endpoint delegation")
class ItineraryControllerTest {

    @Mock private ItineraryService itineraryService;
    @InjectMocks private ItineraryController controller;

    @Test
    @DisplayName("list returns paginated itineraries")
    void list() {
        var page = new PageResponse<>(List.of(
                new ItineraryResponse(1L, 1L, "My Trip", null, null, null, null, null)),
                0, 10, 1, 1, false);
        when(itineraryService.list(anyInt(), anyInt())).thenReturn(page);

        var response = controller.list(0, 10);
        var body = response.getBody();
        assertNotNull(body);
        assertTrue(body.success());
        assertEquals("My Trip", body.data().content().get(0).name());
    }

    @Test
    @DisplayName("create returns 201 with new itinerary")
    void create() {
        when(itineraryService.create(any(ItineraryRequest.class)))
                .thenReturn(new ItineraryResponse(1L, 1L, "New Trip", "{}", null, null, null, null));

        var response = controller.create(new ItineraryRequest("New Trip", "{}", null, null, null));
        var body = response.getBody();
        assertEquals(201, response.getStatusCode().value());
        assertNotNull(body);
        assertEquals("New Trip", body.data().name());
    }

    @Test
    @DisplayName("get returns itinerary by id")
    void get() {
        when(itineraryService.get(1L))
                .thenReturn(new ItineraryResponse(1L, 1L, "My Trip", null, null, null, null, null));

        var response = controller.get(1L);
        assertEquals("My Trip", response.getBody().data().name());
    }

    @Test
    @DisplayName("update modifies existing itinerary")
    void update() {
        when(itineraryService.update(eq(1L), any(ItineraryRequest.class)))
                .thenReturn(new ItineraryResponse(1L, 1L, "Updated", "{\"days\":[]}", null, null, null, null));

        var response = controller.update(1L, new ItineraryRequest("Updated", "{\"days\":[]}", null, null, null));
        assertTrue(response.getBody().success());
        assertEquals("Updated", response.getBody().data().name());
    }

    @Test
    @DisplayName("delete removes itinerary")
    void delete() {
        doNothing().when(itineraryService).delete(1L);

        var response = controller.delete(1L);
        assertNotNull(response.getBody());
        assertTrue(response.getBody().success());
        verify(itineraryService).delete(1L);
    }

    @Test
    @DisplayName("get throws on missing itinerary")
    void getNotFound() {
        when(itineraryService.get(99L)).thenThrow(new ResourceNotFoundException("Itinerary", 99L));
        assertThrows(ResourceNotFoundException.class, () -> controller.get(99L));
    }
}
