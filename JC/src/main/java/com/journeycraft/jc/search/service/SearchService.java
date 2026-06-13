package com.journeycraft.jc.search.service;

import com.journeycraft.jc.diary.dto.DiaryResponse;
import com.journeycraft.jc.diary.repository.DiaryRepository;
import com.journeycraft.jc.food.dto.FoodResponse;
import com.journeycraft.jc.food.repository.FoodRepository;
import com.journeycraft.jc.search.dto.SearchResult;
import com.journeycraft.jc.shop.dto.ShopResponse;
import com.journeycraft.jc.shop.repository.ShopRepository;
import com.journeycraft.jc.spot.dto.SpotResponse;
import com.journeycraft.jc.spot.repository.SpotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final SpotRepository spotRepository;
    private final ShopRepository shopRepository;
    private final FoodRepository foodRepository;
    private final DiaryRepository diaryRepository;

    public SearchResult searchAll(String keyword, int limit) {
        var pageable = PageRequest.of(0, limit);

        // Search spots by keyword (SQL LIKE on name/description/address)
        List<SpotResponse> spots = List.of();
        try {
            spots = spotRepository.searchByKeyword(keyword, pageable)
                    .stream().map(SpotResponse::from).toList();
        } catch (Exception ignored) {}

        // Search shops/restaurants by keyword (SQL LIKE on name/address/description)
        List<ShopResponse> shops = List.of();
        try {
            shops = shopRepository.searchByKeyword(keyword, pageable)
                    .stream().map(ShopResponse::from).toList();
        } catch (Exception ignored) {}

        // Search foods by keyword (SQL LIKE on name/restaurantName/description)
        List<FoodResponse> foods = List.of();
        try {
            foods = foodRepository.searchByKeyword(keyword, pageable)
                    .stream().map(FoodResponse::from).toList();
        } catch (Exception ignored) {}

        // Search diaries by full-text (MongoDB $text index — title, content, contentHtml, destination)
        List<DiaryResponse> diaries = List.of();
        try {
            diaries = diaryRepository.searchByFullText(keyword, pageable)
                    .stream().map(DiaryResponse::from).toList();
        } catch (Exception ignored) {}

        return new SearchResult(spots, shops, foods, diaries);
    }
}
