package com.journeycraft.jc.search.service;

import com.journeycraft.jc.diary.document.Diary;
import com.journeycraft.jc.diary.repository.DiaryRepository;
import com.journeycraft.jc.food.entity.Food;
import com.journeycraft.jc.food.repository.FoodRepository;
import com.journeycraft.jc.shop.entity.Shop;
import com.journeycraft.jc.shop.repository.ShopRepository;
import com.journeycraft.jc.spot.entity.Spot;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SearchService — unified search across spots, foods, diaries")
class SearchServiceTest {

    @Mock private SpotRepository spotRepository;
    @Mock private ShopRepository shopRepository;
    @Mock private FoodRepository foodRepository;
    @Mock private DiaryRepository diaryRepository;

    private SearchService searchService;

    private Spot spot;
    private Shop shop;
    private Food food;
    private Diary diary;

    @BeforeEach
    void setUp() {
        searchService = new SearchService(spotRepository, shopRepository, foodRepository, diaryRepository);

        spot = Spot.builder().id(1L).name("Great Wall").category("scenic")
                .popularity(100).avgRating(BigDecimal.valueOf(4.5)).latitude(40.0).longitude(116.0)
                .address("Changping, Beijing").build();
        shop = Shop.builder().id(1L).name("Quanjude Restaurant").cuisine("Chinese")
                .address("Changping, Beijing").popularity(90).avgRating(BigDecimal.valueOf(4.5))
                .latitude(40.0).longitude(116.0).build();
        food = Food.builder().id(1L).name("Peking Duck").cuisine("Chinese")
                .restaurantName("Quanjude").popularity(90).avgRating(BigDecimal.valueOf(4.5))
                .latitude(40.0).longitude(116.0).description("Famous Beijing roast duck").build();
        diary = Diary.builder().id("d1").userId(1L).title("Beijing Adventure")
                .content("Visited the Great Wall and ate Peking Duck").destination("Beijing")
                .isPublic(true).popularity(50).avgRating(4.0).build();
    }

    @Test
    @DisplayName("searchAll returns results from all four modules")
    void searchAll() {
        when(spotRepository.searchByKeyword(eq("Beijing"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(spot)));
        when(shopRepository.searchByKeyword(eq("Beijing"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(shop)));
        when(foodRepository.searchByKeyword(eq("Beijing"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(food)));
        when(diaryRepository.searchFulltext(anyString(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(diary)));

        var result = searchService.searchAll("Beijing", 5);

        assertEquals(1, result.spots().size());
        assertEquals(1, result.shops().size());
        assertEquals(1, result.foods().size());
        assertEquals(1, result.diaries().size());
        assertEquals("Great Wall", result.spots().get(0).name());
        assertEquals("Quanjude Restaurant", result.shops().get(0).name());
        assertEquals("Peking Duck", result.foods().get(0).name());
        assertEquals("Beijing Adventure", result.diaries().get(0).title());
    }

    @Test
    @DisplayName("searchAll returns empty lists when no matches")
    void searchAllNoResults() {
        when(spotRepository.searchByKeyword(anyString(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(shopRepository.searchByKeyword(anyString(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(foodRepository.searchByKeyword(anyString(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(diaryRepository.searchFulltext(anyString(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));

        var result = searchService.searchAll("nothing", 5);

        assertTrue(result.spots().isEmpty());
        assertTrue(result.shops().isEmpty());
        assertTrue(result.foods().isEmpty());
        assertTrue(result.diaries().isEmpty());
    }

    @Test
    @DisplayName("searchAll diary uses searchFulltext (not just title)")
    void searchAllDiaryUsesFulltext() {
        when(spotRepository.searchByKeyword(anyString(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(shopRepository.searchByKeyword(anyString(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(foodRepository.searchByKeyword(anyString(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(diaryRepository.searchFulltext(anyString(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(diary)));

        var result = searchService.searchAll("Great Wall", 5);

        assertEquals(1, result.diaries().size());
        verify(diaryRepository).searchFulltext(anyString(), any(PageRequest.class));
    }

    @Test
    @DisplayName("searchAll respects limit parameter")
    void searchAllRespectsLimit() {
        when(spotRepository.searchByKeyword(anyString(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(spot)));
        when(shopRepository.searchByKeyword(anyString(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(shop)));
        when(foodRepository.searchByKeyword(anyString(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(food)));
        when(diaryRepository.searchFulltext(anyString(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(diary)));

        var result = searchService.searchAll("test", 5);

        // Verify each repository was called with limit=5
        verify(spotRepository).searchByKeyword(anyString(), eq(PageRequest.of(0, 5)));
        verify(shopRepository).searchByKeyword(anyString(), eq(PageRequest.of(0, 5)));
        verify(foodRepository).searchByKeyword(anyString(), eq(PageRequest.of(0, 5)));
        verify(diaryRepository).searchFulltext(anyString(), eq(PageRequest.of(0, 5)));
    }

    @Test
    @DisplayName("searchAll tolerates individual module failures")
    void searchAllToleratesErrors() {
        when(spotRepository.searchByKeyword(anyString(), any(PageRequest.class)))
                .thenThrow(new RuntimeException("DB error"));
        when(shopRepository.searchByKeyword(anyString(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(shop)));
        when(foodRepository.searchByKeyword(anyString(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(food)));
        when(diaryRepository.searchFulltext(anyString(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(diary)));

        // Should return partial results even when one module fails
        var result = searchService.searchAll("test", 5);

        assertTrue(result.spots().isEmpty()); // failed module
        assertEquals(1, result.shops().size()); // successful
        assertEquals(1, result.foods().size()); // successful
        assertEquals(1, result.diaries().size()); // successful
    }
}
