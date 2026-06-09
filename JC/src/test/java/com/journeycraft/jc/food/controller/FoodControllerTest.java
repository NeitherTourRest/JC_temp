package com.journeycraft.jc.food.controller;

import com.journeycraft.jc.common.dto.PageResponse;
import com.journeycraft.jc.food.dto.FoodResponse;
import com.journeycraft.jc.food.service.FoodService;
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
@DisplayName("FoodController — endpoint delegation tests")
class FoodControllerTest {

    @Mock private FoodService foodService;
    @InjectMocks private FoodController controller;

    @Test
    @DisplayName("getFoodsBySpot delegates to service")
    void getFoodsBySpot() {
        var page = new PageResponse<>(List.of(
                new FoodResponse(1L, "Pizza", "Italian", "Pizza Palace", 1L,
                        null, null, 40.0, 116.0, 90, BigDecimal.valueOf(4.5), 10, null, null, null)),
                0, 10, 1, 1, false);
        when(foodService.getFoodsBySpot(eq(1L), any())).thenReturn(page);

        var response = controller.getFoodsBySpot(1L, null, null, null, 0, 10);
        var body = response.getBody();
        assertNotNull(body);
        assertTrue(body.success());
        assertEquals("Pizza", body.data().content().get(0).name());
    }

    @Test
    @DisplayName("searchFoods returns search results")
    void searchFoods() {
        var page = new PageResponse<>(List.<FoodResponse>of(), 0, 10, 0, 0, false);
        when(foodService.searchGlobalFoods(any())).thenReturn(page);

        var response = controller.searchFoods("pizza", null, null, null, null, 0, 10);
        assertTrue(response.getBody() != null && response.getBody().success());
    }

    @Test
    @DisplayName("getFoodById returns food detail")
    void getFoodById() {
        when(foodService.getFoodById(1L)).thenReturn(
                new FoodResponse(1L, "Pizza", "Italian", "Pizza Palace", 1L,
                        null, null, 40.0, 116.0, 90, BigDecimal.valueOf(4.5), 10, null, null, null));

        var response = controller.getFoodById(1L);
        var body = response.getBody();
        assertNotNull(body);
        assertEquals("Pizza", body.data().name());
    }

    @Test
    @DisplayName("listFoods returns paginated foods")
    void listFoods() {
        var page = new PageResponse<>(List.<FoodResponse>of(), 0, 10, 0, 0, false);
        when(foodService.searchGlobalFoods(any())).thenReturn(page);

        var response = controller.listFoods(0, 10, null);
        assertNotNull(response.getBody());
    }

    @Test
    @DisplayName("searchFoods with lat/lng sorts by distance")
    void searchFoodsWithLocation() {
        var page = new PageResponse<>(List.<FoodResponse>of(), 0, 10, 0, 0, false);
        when(foodService.searchGlobalFoods(any())).thenReturn(page);

        var response = controller.searchFoods(null, null, null, 39.9, 116.4, 0, 10);
        assertTrue(response.getBody() != null && response.getBody().success());
    }
}
