package com.journeycraft.jc.navigation.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

/**
 * POI search service using OSM named nodes data.
 * Loads pois.json (extracted from Changping.osm.pbf) at startup.
 */
@Service
public class POISearchService {

    private static final Logger log = LoggerFactory.getLogger(POISearchService.class);
    private List<POI> pois = new ArrayList<>();

    @PostConstruct
    public void init() {
        try {
            InputStream is = new ClassPathResource("data/pois.json").getInputStream();
            ObjectMapper mapper = new ObjectMapper();
            List<Map<String, Object>> raw = mapper.readValue(is, new TypeReference<>() {});
            for (Map<String, Object> r : raw) {
                String name = (String) r.get("name");
                Object latObj = r.get("lat");
                Object lonObj = r.get("lon");
                if (name != null && latObj instanceof Number && lonObj instanceof Number) {
                    double lat = ((Number) latObj).doubleValue();
                    double lon = ((Number) lonObj).doubleValue();
                    if (lat != 0 || lon != 0) {
                        double[] gcj02 = com.journeycraft.jc.common.util.CoordinateTransform.wgs84ToGcj02(lat, lon);
                        pois.add(new POI(name, gcj02[0], gcj02[1]));
                    }
                }
            }
            log.info("Loaded {} POIs for search", pois.size());
        } catch (Exception e) {
            log.warn("Could not load POIs: {}", e.getMessage());
        }
    }

    public List<POI> search(String keyword, int maxResults) {
        if (keyword == null || keyword.isBlank()) return List.of();
        String kw = keyword.toLowerCase();
        return pois.stream()
                .filter(p -> p.name().toLowerCase().contains(kw))
                .limit(maxResults)
                .collect(Collectors.toList());
    }

    public List<POI> getNearby(double lat, double lon, int maxResults) {
        return pois.stream()
                .sorted(Comparator.comparingDouble(p -> haversine(lat, lon, p.lat(), p.lon())))
                .limit(maxResults)
                .collect(Collectors.toList());
    }

    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    public record POI(String name, double lat, double lon) {}
}
