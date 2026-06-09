package com.journeycraft.jc.spot.service;

import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.common.exception.ResourceNotFoundException;
import com.journeycraft.jc.food.entity.Food;
import com.journeycraft.jc.food.repository.FoodRepository;
import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.common.exception.ResourceNotFoundException;
import com.journeycraft.jc.facility.repository.FacilityRepository;
import com.journeycraft.jc.spot.dto.SpotResponse;
import com.journeycraft.jc.spot.repository.CongestionReportRepository;
import com.journeycraft.jc.user.repository.UserRepository;
import com.journeycraft.jc.spot.dto.SpotSearchRequest;
import com.journeycraft.jc.spot.entity.Spot;
import com.journeycraft.jc.spot.repository.SpotRepository;
import com.journeycraft.jc.spot.repository.SpotReviewRepository;
import com.journeycraft.jc.user.entity.UserPreference;
import com.journeycraft.jc.user.repository.UserPreferenceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SpotService — search, recommend, detail")
class SpotServiceTest {

    @Mock private SpotRepository spotRepository;
    @Mock private SpotReviewRepository spotReviewRepository;
    @Mock private FoodRepository foodRepository;
    @Mock private FacilityRepository facilityRepository;
    @Mock private CongestionReportRepository congestionReportRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserPreferenceRepository userPreferenceRepository;

    private SpotService spotService;

    private Spot spot1, spot2;

    @BeforeEach
    void setUp() {
        spotService = new SpotService(spotRepository, spotReviewRepository, foodRepository, facilityRepository, congestionReportRepository, userRepository, userPreferenceRepository);

        spot1 = Spot.builder().id(1L).name("Great Wall").category("scenic")
                .popularity(100).avgRating(BigDecimal.valueOf(4.5)).latitude(40.0).longitude(116.0).build();
        spot2 = Spot.builder().id(2L).name("Forbidden City").category("museum")
                .popularity(80).avgRating(BigDecimal.valueOf(4.3)).latitude(39.9).longitude(116.4).build();
    }

    @Test
    @DisplayName("searchSpots delegates to repository by keyword")
    void searchByKeyword() {
        when(spotRepository.searchByKeyword(eq("wall"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(spot1)));

        var result = spotService.searchSpots(new SpotSearchRequest("wall", null, null, 0, 10));

        assertEquals(1, result.content().size());
        assertEquals("Great Wall", result.content().get(0).name());
        verify(spotRepository).searchByKeyword(eq("wall"), any(PageRequest.class));
    }

    @Test
    @DisplayName("searchSpots filters by category when specified")
    void searchByCategory() {
        when(spotRepository.searchByKeywordAndCategory(eq("great"), eq("scenic"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(spot1)));

        var result = spotService.searchSpots(new SpotSearchRequest("great", "scenic", null, 0, 10));

        assertEquals(1, result.content().size());
        verify(spotRepository).searchByKeywordAndCategory(eq("great"), eq("scenic"), any(PageRequest.class));
    }

    @Test
    @DisplayName("searchSpots sorts by rating when sortBy='rating'")
    void searchByRating() {
        when(spotRepository.findAllByOrderByAvgRatingDesc(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(spot1, spot2)));

        var result = spotService.searchSpots(new SpotSearchRequest(null, null, "rating", 0, 10));

        assertEquals(2, result.content().size());
        verify(spotRepository).findAllByOrderByAvgRatingDesc(any(PageRequest.class));
    }

    @Test
    @DisplayName("searchSpots defaults to popularity sort")
    void searchDefaultSort() {
        when(spotRepository.findAllByOrderByPopularityDesc(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(spot1, spot2)));

        var result = spotService.searchSpots(new SpotSearchRequest(null, null, null, 0, 10));

        assertEquals(2, result.content().size());
        verify(spotRepository).findAllByOrderByPopularityDesc(any(PageRequest.class));
    }

    @Test
    @DisplayName("searchSpots returns empty when nothing matches")
    void searchEmpty() {
        when(spotRepository.searchByKeyword(eq("nothing"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        var result = spotService.searchSpots(new SpotSearchRequest("nothing", null, null, 0, 10));
        assertTrue(result.content().isEmpty());
    }

    @Test
    @DisplayName("recommendTopK returns top K spots by default")
    void recommendTopK() {
        when(spotRepository.findAll()).thenReturn(List.of(spot1, spot2));

        var result = spotService.recommendTopK(1, null);
        assertEquals(1, result.size());
        assertEquals("Great Wall", result.get(0).name());
    }

    @Test
    @DisplayName("recommendTopK adds bonus for matching user interests")
    void recommendTopKWithInterest() {
        when(spotRepository.findAll()).thenReturn(List.of(spot1, spot2));
        var pref = UserPreference.builder().interestCategories("scenic").build();
        when(userPreferenceRepository.findByUserId(10L)).thenReturn(Optional.of(pref));

        var result = spotService.recommendTopK(2, 10L);
        assertEquals(2, result.size());
        // Great Wall matches interest (scenic) → higher score
        assertEquals("Great Wall", result.get(0).name());
    }

    @Test
    @DisplayName("getSpotDetail increments popularity and returns detail")
    void getSpotDetail() {
        when(spotRepository.findById(1L)).thenReturn(Optional.of(spot1));
        when(foodRepository.findBySpotId(eq(1L), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(spotReviewRepository.findBySpotIdOrderByCreatedAtDesc(eq(1L), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        var result = spotService.getSpotDetail(1L);

        assertEquals("Great Wall", result.name());
        verify(spotRepository).save(spot1); // popularity incremented
        assertEquals(101, spot1.getPopularity()); // 100 + 1
    }

    @Test
    @DisplayName("getSpotDetail throws on missing spot")
    void getSpotDetailNotFound() {
        when(spotRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> spotService.getSpotDetail(99L));
    }

    @Test
    @DisplayName("recommendTopK with non-existent user returns default top K")
    void recommendTopKUserNoPref() {
        when(spotRepository.findAll()).thenReturn(List.of(spot1, spot2));
        when(userPreferenceRepository.findByUserId(99L)).thenReturn(Optional.empty());

        var result = spotService.recommendTopK(2, 99L);
        assertEquals(2, result.size());
    }
}
