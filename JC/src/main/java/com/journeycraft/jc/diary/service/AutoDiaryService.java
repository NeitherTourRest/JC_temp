package com.journeycraft.jc.diary.service;

import com.journeycraft.jc.diary.document.Diary;
import com.journeycraft.jc.diary.dto.DiaryResponse;
import com.journeycraft.jc.diary.repository.DiaryRepository;
import com.journeycraft.jc.itinerary.entity.Itinerary;
import com.journeycraft.jc.itinerary.repository.ItineraryRepository;
import com.journeycraft.jc.spot.entity.Spot;
import com.journeycraft.jc.spot.repository.SpotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service @RequiredArgsConstructor
public class AutoDiaryService {
    private final DiaryRepository diaryRepository;
    private final ItineraryRepository itineraryRepository;
    private final SpotRepository spotRepository;

    @Transactional
    public DiaryResponse generateFromItinerary(Long itineraryId, Long userId) {
        Itinerary it = itineraryRepository.findById(itineraryId).orElse(null);
        String destination = "昌平区";
        List<String> spotNames = new ArrayList<>();
        
        if (it != null) {
            destination = it.getName();
            if (it.getSpotIds() != null) {
                for (String sid : it.getSpotIds().split(",")) {
                    try {
                        spotRepository.findById(Long.parseLong(sid.trim()))
                                .map(Spot::getName).ifPresent(spotNames::add);
                    } catch (NumberFormatException ignored) {}
                }
            }
        }

        StringBuilder content = new StringBuilder();
        content.append("🚀 今天开始了精彩的一日游！\n\n");
        if (!spotNames.isEmpty()) {
            content.append("游览了 ").append(spotNames.size()).append(" 个景点：\n");
            for (int i = 0; i < spotNames.size(); i++) {
                content.append(i + 1).append(". ").append(spotNames.get(i)).append("\n");
            }
        }
        content.append("\n每个景点都留下了美好的回忆！");
        if (it != null && it.getTotalDistance() != null) {
            content.append("\n\n📏 总行程约 ").append(String.format("%.1f", it.getTotalDistance() / 1000)).append(" 公里");
        }

        var diary = Diary.builder()
                .userId(userId).title("自动生成：我的" + destination + "之旅")
                .content(content.toString()).destination(destination).isPublic(false).build();
        return DiaryResponse.from(diaryRepository.save(diary));
    }
}
