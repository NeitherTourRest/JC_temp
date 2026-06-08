package com.journeycraft.jc.indoor.service;

import com.journeycraft.jc.indoor.document.IndoorBuilding;
import com.journeycraft.jc.indoor.document.IndoorBuilding.IndoorNode;
import com.journeycraft.jc.indoor.document.IndoorBuilding.IndoorEdge;
import com.journeycraft.jc.indoor.document.IndoorBuilding.CrossFloorEdge;
import java.util.Optional;
import java.util.List;
import com.journeycraft.jc.indoor.repository.IndoorBuildingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
public class IndoorNavigationService {
    
    private final IndoorBuildingRepository buildingRepository;
    
    /**
     * 室内导航：从起点到终点的最短路径
     */
    public NavigationResult findPath(String buildingId, String fromNodeId, String toNodeId) {
        Optional<IndoorBuilding> buildingOpt = buildingRepository.findByBuildingId(buildingId);
        if (buildingOpt.isEmpty()) {
            return NavigationResult.error("Building not found");
        }
        
        IndoorBuilding building = buildingOpt.get();
        
        // 构建图
        Map<String, IndoorNode> nodeMap = new HashMap<>();
        for (IndoorNode node : building.getNodes()) {
            nodeMap.put(node.getId(), node);
        }
        
        Map<String, List<Edge>> graph = buildGraph(building);
        
        // Dijkstra寻路
        List<String> path = dijkstra(graph, fromNodeId, toNodeId);
        
        if (path == null || path.isEmpty()) {
            return NavigationResult.error("No path found");
        }
        
        // 转换为导航结果
        List<NavigationStep> steps = new ArrayList<>();
        double totalDistance = 0;
        
        for (int i = 0; i < path.size() - 1; i++) {
            String currentNodeId = path.get(i);
            String nextNodeId = path.get(i + 1);
            
            IndoorNode currentNode = nodeMap.get(currentNodeId);
            IndoorNode nextNode = nodeMap.get(nextNodeId);
            
            if (currentNode == null || nextNode == null) continue;
            
            // 查找边的距离
            double dist = findEdgeDistance(building, currentNodeId, nextNodeId);
            totalDistance += dist;
            
            // 判断是否跨层
            boolean crossFloor = !currentNode.getFloor().equals(nextNode.getFloor());
            
            String instruction = generateInstruction(currentNode, nextNode, crossFloor);
            
            steps.add(new NavigationStep(
                currentNodeId,
                nextNodeId,
                currentNode.getName(),
                nextNode.getName(),
                currentNode.getFloor(),
                nextNode.getFloor(),
                dist,
                crossFloor,
                instruction,
                currentNode.getX(),
                currentNode.getY(),
                nextNode.getX(),
                nextNode.getY()
            ));
        }
        
        return NavigationResult.success(steps, totalDistance, building.getFloorPlans());
    }
    
    private Map<String, List<Edge>> buildGraph(IndoorBuilding building) {
        Map<String, List<Edge>> graph = new HashMap<>();
        
        // 添加同层边（双向）
        for (IndoorEdge edge : building.getEdges()) {
            graph.computeIfAbsent(edge.getFrom(), k -> new ArrayList<>())
                .add(new Edge(edge.getTo(), edge.getDist()));
            graph.computeIfAbsent(edge.getTo(), k -> new ArrayList<>())
                .add(new Edge(edge.getFrom(), edge.getDist()));
        }
        
        // 添加跨层边（双向）
        for (CrossFloorEdge edge : building.getCrossFloorEdges()) {
            graph.computeIfAbsent(edge.getFrom(), k -> new ArrayList<>())
                .add(new Edge(edge.getTo(), edge.getDist()));
            graph.computeIfAbsent(edge.getTo(), k -> new ArrayList<>())
                .add(new Edge(edge.getFrom(), edge.getDist()));
        }
        
        return graph;
    }
    
    private List<String> dijkstra(Map<String, List<Edge>> graph, String start, String end) {
        Map<String, Double> distances = new HashMap<>();
        Map<String, String> previous = new HashMap<>();
        PriorityQueue<NodeDistance> pq = new PriorityQueue<>(Comparator.comparingDouble(n -> n.distance));
        
        distances.put(start, 0.0);
        pq.offer(new NodeDistance(start, 0.0));
        
        while (!pq.isEmpty()) {
            NodeDistance current = pq.poll();
            String currentNode = current.node;
            
            if (currentNode.equals(end)) {
                break;
            }
            
            if (current.distance > distances.getOrDefault(currentNode, Double.MAX_VALUE)) {
                continue;
            }
            
            List<Edge> neighbors = graph.getOrDefault(currentNode, Collections.emptyList());
            for (Edge edge : neighbors) {
                double newDist = distances.get(currentNode) + edge.distance;
                if (newDist < distances.getOrDefault(edge.to, Double.MAX_VALUE)) {
                    distances.put(edge.to, newDist);
                    previous.put(edge.to, currentNode);
                    pq.offer(new NodeDistance(edge.to, newDist));
                }
            }
        }
        
        // 重建路径
        if (!previous.containsKey(end)) {
            return null;
        }
        
        List<String> path = new ArrayList<>();
        String current = end;
        while (current != null) {
            path.add(0, current);
            current = previous.get(current);
        }
        
        return path;
    }
    
    private double findEdgeDistance(IndoorBuilding building, String from, String to) {
        // 查找同层边
        for (IndoorEdge edge : building.getEdges()) {
            if ((edge.getFrom().equals(from) && edge.getTo().equals(to)) ||
                (edge.getFrom().equals(to) && edge.getTo().equals(from))) {
                return edge.getDist();
            }
        }
        
        // 查找跨层边
        for (CrossFloorEdge edge : building.getCrossFloorEdges()) {
            if ((edge.getFrom().equals(from) && edge.getTo().equals(to)) ||
                (edge.getFrom().equals(to) && edge.getTo().equals(from))) {
                return edge.getDist();
            }
        }
        
        return 0;
    }
    
    private String generateInstruction(IndoorNode from, IndoorNode to, boolean crossFloor) {
        if (crossFloor) {
            String method = to.getType().equals("ELEVATOR") ? "乘电梯" : "走楼梯";
            return String.format("%s从%s到%s", method, from.getFloor(), to.getFloor());
        } else {
            return String.format("前往%s", to.getName());
        }
    }
    
    // 内部类
    private static class Edge {
        String to;
        double distance;
        
        Edge(String to, double distance) {
            this.to = to;
            this.distance = distance;
        }
    }
    
    private static class NodeDistance {
        String node;
        double distance;
        
        NodeDistance(String node, double distance) {
            this.node = node;
            this.distance = distance;
        }
    }
    
    // 导航结果
    public static class NavigationResult {
        public boolean success;
        public String error;
        public List<NavigationStep> steps;
        public double totalDistance;
        public Map<String, String> floorPlans;
        
        public static NavigationResult success(List<NavigationStep> steps, double totalDistance, Map<String, String> floorPlans) {
            NavigationResult result = new NavigationResult();
            result.success = true;
            result.steps = steps;
            result.totalDistance = totalDistance;
            result.floorPlans = floorPlans;
            return result;
        }
        
        public static NavigationResult error(String error) {
            NavigationResult result = new NavigationResult();
            result.success = false;
            result.error = error;
            return result;
        }
    }
    
    /**
     * 获取楼宇元数据（节点列表 + 平面图映射）
     */
    public BuildingMetadata getBuildingMetadata(String buildingId) {
        Optional<IndoorBuilding> buildingOpt = buildingRepository.findByBuildingId(buildingId);
        if (buildingOpt.isEmpty()) {
            return null;
        }
        IndoorBuilding building = buildingOpt.get();
        BuildingMetadata meta = new BuildingMetadata();
        meta.nodes = building.getNodes();
        meta.edges = building.getEdges();
        meta.crossFloorEdges = building.getCrossFloorEdges();
        meta.floorPlans = building.getFloorPlans();
        return meta;
    }

    public static class BuildingMetadata {
        public List<IndoorNode> nodes;
        public List<IndoorEdge> edges;
        public List<CrossFloorEdge> crossFloorEdges;
        public java.util.Map<String, String> floorPlans;
    }

    public static class NavigationStep {
        public String fromNodeId;
        public String toNodeId;
        public String fromName;
        public String toName;
        public String fromFloor;
        public String toFloor;
        public double distance;
        public boolean crossFloor;
        public String instruction;
        public int fromX, fromY, toX, toY;
        
        public NavigationStep(String fromNodeId, String toNodeId, String fromName, String toName,
                             String fromFloor, String toFloor, double distance, boolean crossFloor,
                             String instruction, int fromX, int fromY, int toX, int toY) {
            this.fromNodeId = fromNodeId;
            this.toNodeId = toNodeId;
            this.fromName = fromName;
            this.toName = toName;
            this.fromFloor = fromFloor;
            this.toFloor = toFloor;
            this.distance = distance;
            this.crossFloor = crossFloor;
            this.instruction = instruction;
            this.fromX = fromX;
            this.fromY = fromY;
            this.toX = toX;
            this.toY = toY;
        }
    }
}
