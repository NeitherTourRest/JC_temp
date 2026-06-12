package com.journeycraft.jc.shop.service;

import com.journeycraft.jc.common.util.AmapWebServiceClient;
import com.journeycraft.jc.common.util.CoordinateConverter;
import com.journeycraft.jc.food.repository.FoodRepository;
import com.journeycraft.jc.navigation.graph.Graph;
import com.journeycraft.jc.shop.entity.Shop;
import com.journeycraft.jc.shop.repository.ShopRepository;
import com.journeycraft.jc.spot.entity.Spot;
import com.journeycraft.jc.spot.repository.SpotRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

/**
 * 从高德 API 拉取昌平区真实的餐馆/店铺数据，刷新 shops 表。
 * 遵循 SpotDataService 的导入模式。
 */
@Service
@RequiredArgsConstructor
public class ShopDataService {

    private static final Logger log = LoggerFactory.getLogger(ShopDataService.class);
    private final ShopRepository shopRepository;
    private final FoodRepository foodRepository;
    private final SpotRepository spotRepository;
    private final AmapWebServiceClient amap;

    /** Amap 搜索关键词配置：各菜系/餐饮分类及目标数量 */
    private static final List<CategoryConfig> CATEGORIES = List.of(
            new CategoryConfig("中餐", 30),
            new CategoryConfig("火锅", 30),
            new CategoryConfig("烧烤", 25),
            new CategoryConfig("快餐", 25),
            new CategoryConfig("小吃", 25),
            new CategoryConfig("西餐", 20),
            new CategoryConfig("日料", 20),
            new CategoryConfig("咖啡厅", 20),
            new CategoryConfig("川菜", 20),
            new CategoryConfig("湘菜", 20),
            new CategoryConfig("粤菜", 20),
            new CategoryConfig("鲁菜", 20),
            new CategoryConfig("面馆", 20),
            new CategoryConfig("饺子", 20),
            new CategoryConfig("韩餐", 20),
            new CategoryConfig("奶茶", 20),
            new CategoryConfig("面包甜点", 20)
    );

    @Transactional
    public int refreshShops() {
        if (!amap.isAvailable()) {
            log.warn("Amap API not available (ws-key missing), cannot refresh shops");
            return 0;
        }

        // 1. Clear dependent tables first (FK-safe order)
        foodRepository.deleteAll();
        shopRepository.deleteAll();
        shopRepository.flush();

        // 2. Fetch all spots for nearest-spot matching
        List<Spot> allSpots = spotRepository.findAll();

        // 3. Fetch POIs from Amap by category, then batch map & deduplicate
        List<Shop> newShops = new ArrayList<>();
        for (var cfg : CATEGORIES) {
            log.info("Fetching shops from Amap (keyword={}, target={})", cfg.keyword, cfg.targetCount);
            var pois = amap.searchPoiAll(cfg.keyword, "昌平", cfg.targetCount);
            for (var poi : pois) {
                double[] wgs = CoordinateConverter.gcj02ToWgs84(poi.lat(), poi.lng());
                // Extract cuisine from Amap type field (e.g. "餐饮服务;中餐厅;川菜" → extract appropriate segment)
                String cuisine = extractCuisine(poi.type(), cfg.keyword);

                // Find nearest spot within 5km
                Long nearestSpotId = findNearestSpot(allSpots, wgs[0], wgs[1]);

                var shop = Shop.builder()
                        .name(poi.name())
                        .address(poi.address())
                        .description(poi.type() + " | " + poi.address())
                        .latitude(wgs[0])
                        .longitude(wgs[1])
                        .cuisine(cuisine)
                        .spotId(nearestSpotId)
                        .popularity(0)
                        .avgRating(BigDecimal.ZERO)
                        .ratingCount(0)
                        .congestionLevel("EMPTY")
                        .imageUrl(poi.imageUrl())
                        .build();
                newShops.add(shop);
            }
        }

        // 4. Deduplicate by name (case-insensitive)
        var seen = new HashSet<String>();
        var unique = new ArrayList<Shop>();
        for (var s : newShops) {
            if (seen.add(s.getName().toLowerCase())) {
                unique.add(s);
            }
        }

        // 5. Batch save
        shopRepository.saveAll(unique);
        log.info("Refreshed {} shops ({} unique from {} raw POIs)", unique.size(), unique.size(), newShops.size());
        return unique.size();
    }

    /**
     * 从 Amap type 字段中提取菜品分类。
     * Amap type 格式："大类;中类;小类"，例如 "餐饮服务;中餐厅;川菜"。
     * 优先用搜索关键词作为 cuisine，否则取最后一个有意义的 type 段。
     */
    private String extractCuisine(String amapType, String searchKeyword) {
        if (amapType == null || amapType.isBlank()) return searchKeyword;
        String[] parts = amapType.split(";");
        // Use the most specific segment (last) as cuisine hint
        String last = parts[parts.length - 1].trim();
        if (last.isEmpty()) return searchKeyword;
        // Normalize: strip common suffixes
        String normalized = last
                .replace("餐厅", "")
                .replace("馆", "")
                .replace("店", "")
                .replace("厅", "");
        return normalized.isBlank() ? searchKeyword : last;
    }

    /**
     * 在所有景点中找到距离目标坐标最近且在 5km 内的景点 ID。
     */
    private Long findNearestSpot(List<Spot> spots, double lat, double lng) {
        if (spots == null || spots.isEmpty()) return null;
        Long nearestId = null;
        double minDist = Double.MAX_VALUE;
        for (var spot : spots) {
            double dist = Graph.haversineDistance(lat, lng, spot.getLatitude(), spot.getLongitude());
            if (dist < minDist) {
                minDist = dist;
                nearestId = spot.getId();
            }
        }
        // Only assign if within 5km
        return minDist <= 5000 ? nearestId : null;
    }

    private record CategoryConfig(String keyword, int targetCount) {}
}
