package com.journeycraft.jc.common.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 高德 Web Service API 客户端。
 * 提供 POI 搜索和地理编码功能。
 */
@Component
public class AmapWebServiceClient {

    private static final Logger log = LoggerFactory.getLogger(AmapWebServiceClient.class);
    private final RestTemplate restTemplate = new RestTemplate();
    private final String apiKey;

    public AmapWebServiceClient(@Value("${app.amap.ws-key:}") String apiKey) {
        this.apiKey = apiKey;
    }

    public boolean isAvailable() {
        return apiKey != null && !apiKey.isEmpty() && !apiKey.equals("your_amap_key_here");
    }

    /**
     * POI 搜索 —— 按关键字搜索昌平区的地点。
     */
    public List<AmapPoi> searchPoi(String keywords, String city, int pageSize, int page) {
        if (!isAvailable()) {
            log.warn("Amap API key not configured, skipping POI search");
            return List.of();
        }
        try {
            var url = "https://restapi.amap.com/v3/place/text"
                    + "?key=" + apiKey
                    + "&keywords=" + java.net.URLEncoder.encode(keywords, "UTF-8")
                    + "&city=" + java.net.URLEncoder.encode(city != null ? city : "北京", "UTF-8")
                    + "&offset=" + pageSize
                    + "&page=" + page
                    + "&extensions=all";
            var resp = restTemplate.getForObject(url, Map.class);
            if (resp != null && "1".equals(resp.get("status"))) {
                List<Map<String, Object>> pois = (List<Map<String, Object>>) resp.get("pois");
                if (pois == null) return List.of();
                return pois.stream().map(this::toPoi).toList();
            }
            return List.of();
        } catch (Exception e) {
            log.error("Amap POI search error: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * 地理编码 —— 将地址/名称转为坐标。
     */
    public AmapGeocode geocode(String address, String city) {
        if (!isAvailable()) return null;
        try {
            var url = "https://restapi.amap.com/v3/geocode/geo"
                    + "?key=" + apiKey
                    + "&address=" + java.net.URLEncoder.encode(address, "UTF-8")
                    + "&city=" + java.net.URLEncoder.encode(city != null ? city : "北京", "UTF-8");
            var resp = restTemplate.getForObject(url, Map.class);
            if (resp != null && "1".equals(resp.get("status"))) {
                List<Map<String, Object>> geocodes = (List<Map<String, Object>>) resp.get("geocodes");
                if (geocodes != null && !geocodes.isEmpty()) {
                    Map<String, Object> first = geocodes.get(0);
                    String location = (String) first.get("location");
                    if (location != null) {
                        String[] parts = location.split(",");
                        return new AmapGeocode(
                                Double.parseDouble(parts[1]),
                                Double.parseDouble(parts[0]),
                                (String) first.get("formatted_address"),
                                (String) first.get("level")
                        );
                    }
                }
            }
            return null;
        } catch (Exception e) {
            log.error("Amap geocode error: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 批量搜索多个分类的 POI，自动翻页。
     */
    public List<AmapPoi> searchPoiAll(String keywords, String city, int maxResults) {
        List<AmapPoi> all = new ArrayList<>();
        int page = 1;
        while (all.size() < maxResults) {
            var pageResults = searchPoi(keywords, city, 20, page);
            if (pageResults.isEmpty()) break;
            all.addAll(pageResults);
            if (pageResults.size() < 20) break;
            page++;
        }
        return all.size() > maxResults ? all.subList(0, maxResults) : all;
    }

    private AmapPoi toPoi(Map<String, Object> poi) {
        String location = (String) poi.get("location");
        double lat = 0, lng = 0;
        if (location != null) {
            String[] parts = location.split(",");
            if (parts.length == 2) {
                lng = Double.parseDouble(parts[0]);
                lat = Double.parseDouble(parts[1]);
            }
        }
        // Extract business area, address, etc.
        @SuppressWarnings("unchecked")
        var businessArea = poi.get("business_area") != null ? (String) poi.get("business_area") : "";
        var address = poi.get("address") != null ? (String) poi.get("address") : "";
        var name = poi.get("name") != null ? (String) poi.get("name") : "";
        var type = poi.get("type") != null ? (String) poi.get("type") : "";
        var typecode = poi.get("typecode") != null ? (String) poi.get("typecode") : "";

        // Extract photos and description
        @SuppressWarnings("unchecked")
        var photos = (List<Map<String, Object>>) poi.get("photos");
        String imageUrl = null;
        if (photos != null && !photos.isEmpty()) {
            imageUrl = (String) photos.get(0).get("url");
        }

        return new AmapPoi(name, address, lat, lng, type, typecode, businessArea, imageUrl);
    }

    public record AmapPoi(String name, String address, double lat, double lng, String type, String typecode, String businessArea, String imageUrl) {}
    public record AmapGeocode(double lat, double lng, String formattedAddress, String level) {}
}
