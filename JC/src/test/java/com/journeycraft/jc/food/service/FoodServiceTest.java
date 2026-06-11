package com.journeycraft.jc.food.service;

import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.common.exception.ResourceNotFoundException;
import com.journeycraft.jc.food.dto.FoodResponse;
import com.journeycraft.jc.food.dto.FoodSearchRequest;
import com.journeycraft.jc.food.entity.Food;
import com.journeycraft.jc.food.repository.FoodRepository;
import com.journeycraft.jc.spot.repository.SpotRepository;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("FoodService — search, spot-based query, global fuzzy search")
class FoodServiceTest {

    @Mock private FoodRepository foodRepository;
    @Mock private com.journeycraft.jc.food.repository.FoodReviewRepository foodReviewRepository;
    @Mock private com.journeycraft.jc.user.repository.UserRepository userRepository;
    @Mock private com.journeycraft.jc.common.service.CongestionService congestionService;
    @Mock private com.journeycraft.jc.navigation.graph.Graph navigationGraph;
    @Mock private SpotRepository spotRepository;

    private FoodService foodService;

    private Food pizza, sushi;

    @BeforeEach
    void setUp() {
        foodService = new FoodService(foodRepository, foodReviewRepository, userRepository, congestionService, navigationGraph, spotRepository);

        pizza = Food.builder().id(1L).name("Margherita Pizza").cuisine("Italian")
                .restaurantName("Pizza Palace").popularity(90).avgRating(BigDecimal.valueOf(4.5))
                .latitude(40.0).longitude(116.0).spotId(1L)
                .description("Classic Italian pizza with fresh mozzarella").build();
        sushi = Food.builder().id(2L).name("Salmon Sushi").cuisine("Japanese")
                .restaurantName("Sushi Bar").popularity(85).avgRating(BigDecimal.valueOf(4.3))
                .latitude(40.05).longitude(116.05).spotId(1L)
                .description("Fresh salmon rolls with rice").build();
    }

    @Test
    @DisplayName("searchFoods delegates to repository")
    void searchFoods() {
        when(foodRepository.searchByKeyword(eq("pizza"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(pizza)));

        var result = foodService.searchFoods(new FoodSearchRequest("pizza", null, null, null, 0, 10, null, null));

        assertEquals(1, result.content().size());
        assertEquals("Margherita Pizza", result.content().get(0).name());
    }

    @Test
    @DisplayName("getFoodsBySpot returns foods for a spot sorted by popularity")
    void getFoodsBySpot() {
        when(foodRepository.findBySpotIdOrderByPopularityDesc(eq(1L), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(pizza, sushi)));

        var result = foodService.getFoodsBySpot(1L, new FoodSearchRequest(null, null, null, null, 0, 10, null, null));

        assertEquals(2, result.content().size());
        verify(foodRepository).findBySpotIdOrderByPopularityDesc(eq(1L), any(PageRequest.class));
    }

    @Test
    @DisplayName("searchGlobalFoods matches by description field")
    void searchGlobalFoodsByDescription() {
        when(foodRepository.searchByKeyword(eq("mozzarella"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(pizza)));

        var result = foodService.searchGlobalFoods(
                new FoodSearchRequest("mozzarella", null, null, null, 0, 10, null, null));

        assertEquals(1, result.content().size());
        assertEquals("Margherita Pizza", result.content().get(0).name());
    }

    @Test
    @DisplayName("searchGlobalFoods maintains SQL LIKE results via substring even when FuzzyMatcher misses")
    void searchGlobalFoodsSubstringRescue() {
        // SQL LIKE %Palace% matches "Pizza Palace" in restaurantName
        // but FuzzyMatcher.matches("Pizza Palace", "Palace", 2) fails (distance > 2)
        // Substring check saves it
        when(foodRepository.searchByKeyword(eq("Palace"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(pizza)));

        var result = foodService.searchGlobalFoods(
                new FoodSearchRequest("Palace", null, null, null, 0, 10, null, null));

        assertEquals(1, result.content().size(), "Substring match should survive FuzzyMatcher post-filter");
        assertEquals("Margherita Pizza", result.content().get(0).name());
    }

    @Test
    @DisplayName("searchGlobalFoods matches by restaurant name substring")
    void searchGlobalFoodsByRestaurantSubstring() {
        // Search for "Palace" matches "Pizza Palace" (substring)
        when(foodRepository.searchByKeyword(eq("Palace"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(pizza)));

        var result = foodService.searchGlobalFoods(
                new FoodSearchRequest("Palace", null, null, null, 0, 10, null, null));

        assertEquals(1, result.content().size());
    }

    @Test
    @DisplayName("searchGlobalFoods matches by cuisine via FuzzyMatcher (exact match)")
    void searchGlobalFoodsFuzzy() {
        when(foodRepository.searchByKeyword(eq("Italian"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(pizza, sushi)));

        var result = foodService.searchGlobalFoods(
                new FoodSearchRequest("Italian", null, null, null, 0, 10, null, null));

        // "Italian" matches pizza's cuisine exactly (distance 0), sushi "Japanese" does not (distance 5+)
        assertEquals(1, result.content().size());
        assertEquals("Margherita Pizza", result.content().get(0).name());
    }

    @Test
    @DisplayName("searchGlobalFoods sorts by distance when requested")
    void searchGlobalFoodsDistanceSort() {
        when(foodRepository.searchByKeyword(eq(""), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(pizza, sushi)));

        // Query from (39.95, 116.025) — check it sorts by distance
        var result = foodService.searchGlobalFoods(
                new FoodSearchRequest(null, null, null, "distance", 0, 10, 39.95, 116.025));

        assertEquals(2, result.content().size());
    }

    @Test
    @DisplayName("searchGlobalFoods without sort defaults to no sort")
    void searchGlobalFoodsNoSort() {
        when(foodRepository.searchByKeyword(eq(""), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(pizza, sushi)));

        var result = foodService.searchGlobalFoods(new FoodSearchRequest(null, null, null, null, 0, 10, null, null));
        assertEquals(2, result.content().size());
    }

    @Test
    @DisplayName("searchGlobalFoods without keyword returns all without post-filter")
    void searchGlobalFoodsNoKeyword() {
        when(foodRepository.searchByKeyword(eq(""), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(pizza, sushi)));

        var result = foodService.searchGlobalFoods(new FoodSearchRequest(null, null, null, null, 0, 10, null, null));
        assertEquals(2, result.content().size());
    }

    @Test
    @DisplayName("getFoodById returns food and increments popularity")
    void getFoodById() {
        when(foodRepository.findById(1L)).thenReturn(Optional.of(pizza));

        var result = foodService.getFoodById(1L);
        assertEquals("Margherita Pizza", result.name());
        verify(foodRepository).save(pizza);
        assertEquals(91, pizza.getPopularity()); // 90 + 1
    }

    @Test
    @DisplayName("getFoodById throws on missing food")
    void getFoodByIdNotFound() {
        when(foodRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> foodService.getFoodById(99L));
    }
}
