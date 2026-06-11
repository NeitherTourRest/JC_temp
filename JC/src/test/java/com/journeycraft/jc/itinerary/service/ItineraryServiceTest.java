package com.journeycraft.jc.itinerary.service;

import com.journeycraft.jc.common.exception.ResourceNotFoundException;
import com.journeycraft.jc.itinerary.dto.ItineraryRequest;
import com.journeycraft.jc.itinerary.entity.Itinerary;
import com.journeycraft.jc.itinerary.repository.ItineraryRepository;
import com.journeycraft.jc.user.entity.User;
import com.journeycraft.jc.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
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
@DisplayName("ItineraryService — CRUD operations")
class ItineraryServiceTest {

    @Mock private ItineraryRepository itineraryRepository;
    @Mock private UserRepository userRepository;
    @Mock private SecurityContext securityContext;
    @Mock private Authentication authentication;

    private ItineraryService itineraryService;
    private User user;

    @BeforeEach
    void setUp() {
        itineraryService = new ItineraryService(itineraryRepository, userRepository);
        user = User.builder().id(1L).username("testuser").build();

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("testuser");
        SecurityContextHolder.setContext(securityContext);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
    }

    @Test
    @DisplayName("create saves and returns new itinerary")
    void create() {
        var saved = Itinerary.builder().id(1L).userId(1L).name("My Trip").routeData("{}").build();
        when(itineraryRepository.save(any(Itinerary.class))).thenReturn(saved);

        var result = itineraryService.create(new ItineraryRequest("My Trip", "{}", null, null, null));
        assertEquals("My Trip", result.name());
        verify(itineraryRepository).save(any(Itinerary.class));
    }

    @Test
    @DisplayName("list returns user's itineraries paginated")
    void list() {
        var page = new PageImpl<>(List.of(
                Itinerary.builder().id(1L).userId(1L).name("Trip 1").build()));
        when(itineraryRepository.findByUserIdOrderByCreatedAtDesc(eq(1L), any(PageRequest.class))).thenReturn(page);

        var result = itineraryService.list(0, 10, null);
        assertEquals(1, result.content().size());
        assertEquals("Trip 1", result.content().get(0).name());
    }

    @Test
    @DisplayName("list with keyword calls searchByUserIdAndKeyword")
    void listWithKeyword() {
        var page = new PageImpl<>(List.of(
                Itinerary.builder().id(1L).userId(1L).name("Beijing Trip").routeData("Great Wall, Forbidden City").build()));
        when(itineraryRepository.searchByUserIdAndKeyword(eq(1L), eq("Beijing"), any(PageRequest.class))).thenReturn(page);

        var result = itineraryService.list(0, 10, "Beijing");
        assertEquals(1, result.content().size());
        assertEquals("Beijing Trip", result.content().get(0).name());
        verify(itineraryRepository).searchByUserIdAndKeyword(eq(1L), eq("Beijing"), any(PageRequest.class));
        verify(itineraryRepository, never()).findByUserIdOrderByCreatedAtDesc(anyLong(), any());
    }

    @Test
    @DisplayName("list with routeData keyword returns matching itinerary")
    void listWithRouteDataKeyword() {
        var page = new PageImpl<>(List.of(
                Itinerary.builder().id(2L).userId(1L).name("Summer Vacation").routeData("visited Great Wall, ate Peking Duck").build()));
        when(itineraryRepository.searchByUserIdAndKeyword(eq(1L), eq("Peking Duck"), any(PageRequest.class))).thenReturn(page);

        var result = itineraryService.list(0, 10, "Peking Duck");
        assertEquals(1, result.content().size());
    }

    @Test
    @DisplayName("get returns itinerary by id")
    void get() {
        var itinerary = Itinerary.builder().id(1L).userId(1L).name("My Trip").build();
        when(itineraryRepository.findById(1L)).thenReturn(Optional.of(itinerary));

        var result = itineraryService.get(1L);
        assertEquals("My Trip", result.name());
    }

    @Test
    @DisplayName("get throws on missing itinerary")
    void getNotFound() {
        when(itineraryRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> itineraryService.get(99L));
    }

    @Test
    @DisplayName("update modifies existing itinerary fields")
    void update() {
        var existing = Itinerary.builder().id(1L).userId(1L).name("Old Name").routeData("{}").build();
        when(itineraryRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(itineraryRepository.save(any(Itinerary.class))).thenAnswer(i -> i.getArgument(0));

        var result = itineraryService.update(1L, new ItineraryRequest("Updated Name", "{\"days\":[]}", "1,2,3", 100.0, 3600));

        assertEquals("Updated Name", result.name());
        assertEquals("{\"days\":[]}", result.routeData());
        assertEquals("1,2,3", result.spotIds());
        assertEquals(100.0, result.totalDistance());
        assertEquals(3600, result.totalTime());
        verify(itineraryRepository).save(existing);
    }

    @Test
    @DisplayName("update throws on missing itinerary")
    void updateNotFound() {
        when(itineraryRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,
                () -> itineraryService.update(99L, new ItineraryRequest("Name", null, null, null, null)));
    }

    @Test
    @DisplayName("delete removes itinerary")
    void delete() {
        doNothing().when(itineraryRepository).deleteById(1L);
        itineraryService.delete(1L);
        verify(itineraryRepository).deleteById(1L);
    }
}
