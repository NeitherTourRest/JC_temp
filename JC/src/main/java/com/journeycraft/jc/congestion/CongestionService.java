package com.journeycraft.jc.congestion;

import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
@EnableScheduling
public class CongestionService {

    private final Map<String, CongestionArea> areas = new ConcurrentHashMap<>();
    private final Random random = new Random();

    public CongestionService() {
        // Initialize Changping areas with random congestion levels
        areas.put("area_十三陵", new CongestionArea("十三陵景区", 40.253, 116.218, "LOW"));
        areas.put("area_居庸关", new CongestionArea("居庸关长城", 40.289, 116.068, "MEDIUM"));
        areas.put("area_蟒山", new CongestionArea("蟒山森林公园", 40.265, 116.275, "LOW"));
        areas.put("area_温都水城", new CongestionArea("温都水城", 40.115, 116.425, "LOW"));
        areas.put("area_航空博物馆", new CongestionArea("航空博物馆", 40.185, 116.360, "LOW"));
        areas.put("area_昌平公园", new CongestionArea("昌平公园", 40.220, 116.230, "MEDIUM"));
        areas.put("area_沙河高教园", new CongestionArea("沙河高教园", 40.155, 116.275, "HIGH"));
    }

    /**
     * Simulate congestion changes every 30 seconds.
     * In production, this would read from IoT sensors or user reports.
     */
    @Scheduled(fixedRate = 30000)
    public void updateCongestion() {
        for (CongestionArea area : areas.values()) {
            // 20% chance of changing level
            if (random.nextDouble() < 0.2) {
                String[] levels = {"LOW", "MEDIUM", "HIGH"};
                area.level = levels[random.nextInt(3)];
            }
        }
    }

    public Map<String, CongestionArea> getAllAreas() {
        return Map.copyOf(areas);
    }

    public CongestionArea getArea(String areaId) {
        return areas.get(areaId);
    }

    public static class CongestionArea {
        public String name;
        public double lat;
        public double lng;
        public String level; // LOW, MEDIUM, HIGH

        public CongestionArea(String name, double lat, double lng, String level) {
            this.name = name; this.lat = lat; this.lng = lng; this.level = level;
        }
    }
}
