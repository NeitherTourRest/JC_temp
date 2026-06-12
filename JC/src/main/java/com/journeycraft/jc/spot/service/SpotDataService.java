package com.journeycraft.jc.spot.service;

import com.journeycraft.jc.common.util.AmapWebServiceClient;
import com.journeycraft.jc.common.util.CoordinateConverter;
import com.journeycraft.jc.facility.repository.FacilityRepository;
import com.journeycraft.jc.spot.entity.Spot;
import com.journeycraft.jc.spot.repository.SpotRepository;
import com.journeycraft.jc.spot.repository.SpotReviewRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.HashSet;

/**
 * 从高德 API 拉取真实景点数据，刷新 spots 表。
 */
@Service
@RequiredArgsConstructor
public class SpotDataService {

    private static final Logger log = LoggerFactory.getLogger(SpotDataService.class);
    private final SpotRepository spotRepository;
    private final FacilityRepository facilityRepository;
    private final SpotReviewRepository spotReviewRepository;
    private final AmapWebServiceClient amap;

    private static final List<CategoryConfig> CATEGORIES = List.of(
            new CategoryConfig("景区", "旅游景点", 60),
            new CategoryConfig("景区", "名胜古迹", 30),
            new CategoryConfig("公园", "公园", 40),
            new CategoryConfig("商场", "购物中心", 25),
            new CategoryConfig("校园", "大学", 60),
            new CategoryConfig("校园", "学院", 40)
    );

    @Transactional
    public int refreshSpots() {
        if (!amap.isAvailable()) {
            log.warn("Amap API not available (ws-key missing), cannot refresh spots");
            return 0;
        }

        // Clear dependent tables first to avoid FK constraints
        facilityRepository.deleteAll();
        spotReviewRepository.deleteAll();
        spotRepository.deleteAll();
        spotRepository.flush();

        List<Spot> newSpots = new ArrayList<>();
        for (var cfg : CATEGORIES) {
            log.info("Fetching {} from Amap (keyword={}, target={})",
                    cfg.category, cfg.keyword, cfg.targetCount);
            var pois = amap.searchPoiAll(cfg.keyword, "昌平", cfg.targetCount);
            for (var poi : pois) {
                double[] wgs = CoordinateConverter.gcj02ToWgs84(poi.lat(), poi.lng());
                var spot = Spot.builder()
                        .name(poi.name())
                        .category(cfg.category)
                        .description(poi.type())
                        .address(poi.address())
                        .latitude(wgs[0])
                        .longitude(wgs[1])
                        .popularity(0)
                        .avgRating(BigDecimal.ZERO)
                        .ratingCount(0)
                        .congestionLevel("EMPTY")
                        .imageUrl(poi.imageUrl())
                        .build();
                newSpots.add(spot);
            }
        }

        // Deduplicate by name
        var seen = new HashSet<String>();
        var unique = new ArrayList<Spot>();
        for (var s : newSpots) {
            if (seen.add(s.getName().toLowerCase())) {
                unique.add(s);
            }
        }

        spotRepository.saveAll(unique);
        log.info("Refreshed {} spots ({} unique from {} raw POIs)", unique.size(), unique.size(), newSpots.size());
        return unique.size();
    }

    private record CategoryConfig(String category, String keyword, int targetCount) {}
}
