package com.journeycraft.jc.common.config;

import com.journeycraft.jc.common.util.CoordinateTransform;
import com.journeycraft.jc.navigation.graph.Graph;
import com.journeycraft.jc.navigation.graph.GraphEdge;
import com.journeycraft.jc.navigation.graph.GraphNode;
import com.journeycraft.jc.navigation.repository.RoadEdgeRepository;
import com.journeycraft.jc.navigation.repository.RoadNodeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Loads OSM road network from MySQL into in-memory navigation graph.
 * Converts coordinates from WGS-84 (OSM) to GCJ-02 (AMap) at load time.
 */
@Component
public class GraphDataLoader implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(GraphDataLoader.class);
    private final Graph navigationGraph;
    private final RoadNodeRepository roadNodeRepo;
    private final RoadEdgeRepository roadEdgeRepo;

    public GraphDataLoader(Graph navigationGraph, RoadNodeRepository roadNodeRepo, RoadEdgeRepository roadEdgeRepo) {
        this.navigationGraph = navigationGraph;
        this.roadNodeRepo = roadNodeRepo;
        this.roadEdgeRepo = roadEdgeRepo;
    }

    @Override
    public void run(String... args) {
        long nodeCount = roadNodeRepo.count();
        if (nodeCount == 0) {
            log.warn("No road network data in MySQL. Run import script first: python scripts/import_osm_to_mysql.py");
            return;
        }

        log.info("Loading {} road nodes from MySQL (WGS-84 -> GCJ-02)...", nodeCount);
        long start = System.currentTimeMillis();

        // Batch load all nodes into memory graph, converting to GCJ-02 for AMap compatibility
        var nodePage = roadNodeRepo.findAll(
                org.springframework.data.domain.PageRequest.of(0, Integer.MAX_VALUE));
        for (var rn : nodePage) {
            double[] gcj02 = CoordinateTransform.wgs84ToGcj02(rn.getLatitude(), rn.getLongitude());
            navigationGraph.addNode(new GraphNode(rn.getNodeId(), gcj02[0], gcj02[1]));
        }
        log.info("Loaded {} nodes (converted to GCJ-02)", nodePage.getTotalElements());

        // Load edges (edge distances are computed from node coordinates, now in GCJ-02)
        var allEdges = roadEdgeRepo.findAll();
        int edgeCount = 0;
        for (var re : allEdges) {
            navigationGraph.addEdge(GraphEdge.builder()
                    .edgeId(re.getEdgeId())
                    .fromNodeId(re.getFromNodeId()).toNodeId(re.getToNodeId())
                    .distance(re.getDistance() != null ? re.getDistance() : 100)
                    .roadType(re.getRoadType()).name(re.getName() != null ? re.getName() : "")
                    .isOneWay(re.getIsOneWay() != null ? re.getIsOneWay() : false)
                    .maxSpeed(re.getMaxSpeed() != null ? re.getMaxSpeed() : 40)
                    .congestionLevel(re.getCongestionLevel() != null ? re.getCongestionLevel() : "LOW")
                    .build());
            edgeCount++;
        }

        long duration = System.currentTimeMillis() - start;
        log.info("Road network loaded from MySQL: {} nodes, {} edges in {}ms ({}MB)",
                navigationGraph.getNodeCount(), navigationGraph.getEdgeCount(),
                duration, Runtime.getRuntime().totalMemory() / 1024 / 1024);

        // Compute connected components for disconnected graph detection
        start = System.currentTimeMillis();
        navigationGraph.computeComponents();
        duration = System.currentTimeMillis() - start;
        log.info("Connected components: {} ({} singletons) in {}ms",
                navigationGraph.getComponentCount(),
                navigationGraph.getComponentSizes().values().stream().filter(s -> s == 1).count(),
                duration);
    }
}
