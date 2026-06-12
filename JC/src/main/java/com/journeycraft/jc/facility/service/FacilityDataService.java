package com.journeycraft.jc.facility.service;

import com.journeycraft.jc.facility.entity.Facility;
import com.journeycraft.jc.facility.repository.FacilityRepository;
import com.journeycraft.jc.spot.entity.Spot;
import com.journeycraft.jc.spot.repository.SpotRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * 根据景点分类自动生成内部设施。
 * 每个景点的设施在其坐标周围做微小偏移，模拟真实分布。
 */
@Service
@RequiredArgsConstructor
public class FacilityDataService {

    private static final Logger log = LoggerFactory.getLogger(FacilityDataService.class);
    private final FacilityRepository facilityRepository;
    private final SpotRepository spotRepository;

    private static final Random RANDOM = new Random(42); // fixed seed for reproducibility

    /**
     * 设施生成模板：分类 → (哪些景点类别生成该设施, 每个景点生成几个, 设施名称模板)
     */
    private static final List<FacilityTemplate> TEMPLATES = List.of(
            new FacilityTemplate("TOILET", List.of("景区", "公园", "商场", "校园"), 2,
                    "卫生间", "洗手间", "公共厕所"),
            new FacilityTemplate("PARKING", List.of("景区", "公园", "商场"), 1,
                    "停车场", "地下停车场"),
            new FacilityTemplate("SERVICE", List.of("景区"), 1,
                    "游客服务中心", "游客中心"),
            new FacilityTemplate("TICKET", List.of("景区"), 1,
                    "售票处", "票务中心"),
            new FacilityTemplate("CLASSROOM", List.of("校园"), 5,
                    "教学楼", "主教学楼", "实验楼", "逸夫楼", "综合教学楼"),
            new FacilityTemplate("LIBRARY", List.of("校园"), 1,
                    "图书馆"),
            new FacilityTemplate("DORMITORY", List.of("校园"), 4,
                    "学生宿舍", "研究生宿舍", "留学生宿舍", "教师公寓"),
            new FacilityTemplate("CAFETERIA", List.of("校园", "景区", "商场"), 2,
                    "食堂", "学生餐厅", "美食广场"),
            new FacilityTemplate("GYM", List.of("校园"), 1,
                    "体育场", "体育馆", "操场"),
            new FacilityTemplate("SUPERMARKET", List.of("校园", "商场"), 1,
                    "超市", "便利店"),
            new FacilityTemplate("CAFE", List.of("景区", "商场", "校园"), 1,
                    "咖啡馆", "咖啡厅"),
            new FacilityTemplate("HOSPITAL", List.of("景区", "校园"), 1,
                    "医务室", "医疗点")
    );

    @Transactional
    public int refreshFacilities() {
        facilityRepository.deleteAll();
        facilityRepository.flush();

        List<Facility> all = new ArrayList<>();
        List<Spot> spots = spotRepository.findAll();

        for (var spot : spots) {
            for (var tmpl : TEMPLATES) {
                if (!tmpl.spotCategories.contains(spot.getCategory())) continue;

                for (int i = 0; i < tmpl.count; i++) {
                    String name = tmpl.nameTemplates[i % tmpl.nameTemplates.length];
                    if (tmpl.count > 1 && tmpl.nameTemplates.length > 1) {
                        name = tmpl.nameTemplates[i];
                    }

                    // Offset coordinates slightly to simulate real distribution
                    double latOffset = (RANDOM.nextDouble() - 0.5) * 0.002; // ~100m
                    double lngOffset = (RANDOM.nextDouble() - 0.5) * 0.002;

                    var facility = Facility.builder()
                            .name(name)
                            .category(tmpl.category)
                            .latitude(spot.getLatitude() + latOffset)
                            .longitude(spot.getLongitude() + lngOffset)
                            .spotId(spot.getId())
                            .build();
                    all.add(facility);
                }
            }
        }

        facilityRepository.saveAll(all);
        log.info("Generated {} facilities for {} spots", all.size(), spots.size());
        return all.size();
    }

    private record FacilityTemplate(String category, List<String> spotCategories, int count, String... nameTemplates) {}
}
