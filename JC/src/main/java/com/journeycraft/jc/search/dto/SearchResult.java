package com.journeycraft.jc.search.dto;

import com.journeycraft.jc.spot.dto.SpotResponse;
import com.journeycraft.jc.food.dto.FoodResponse;
import com.journeycraft.jc.diary.dto.DiaryResponse;

import java.util.List;

public record SearchResult(
        List<SpotResponse> spots,
        List<FoodResponse> foods,
        List<DiaryResponse> diaries
) {}
