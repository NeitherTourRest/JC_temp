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
        String normalizedFrom = normalizeNodeId(fromNodeId);
        String normalizedTo = normalizeNodeId(toNodeId);

        if (findNode(building, normalizedFrom) == null || findNode(building, normalizedTo) == null) {
            return NavigationResult.error("Invalid indoor node selection");
        }

        if (normalizedFrom.equals(normalizedTo)) {
            IndoorNode node = findNode(building, normalizedFrom);
            NavigationStep step = new NavigationStep(
                normalizedFrom,
                normalizedTo,
                displayName(node),
                displayName(node),
                node.getFloor(),
                node.getFloor(),
                0,
                false,
                String.format("已位于%s，无需移动。", displayName(node)),
                node.getX(),
                node.getY(),
                node.getX(),
                node.getY()
            );
            return NavigationResult.success(List.of(step), 0, building.getFloorPlans(), List.of(normalizedFrom));
        }

        // 构建图
        Map<String, IndoorNode> nodeMap = new HashMap<>();
        for (IndoorNode node : Optional.ofNullable(building.getNodes()).orElseGet(List::of)) {
            nodeMap.put(normalizeNodeId(node.getId()), node);
        }

        Map<String, List<Edge>> graph = buildGraph(building);

        // Dijkstra寻路
        List<String> path = dijkstra(graph, normalizedFrom, normalizedTo);
        
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

            if (currentNode == null) {
                currentNode = findNode(building, currentNodeId);
            }
            if (nextNode == null) {
                nextNode = findNode(building, nextNodeId);
            }

            if (currentNode == null || nextNode == null) continue;
            
            // 查找边的距离
            Edge edge = findEdge(building, currentNodeId, nextNodeId);
            double dist = edge == null ? 0 : edge.distance;
            totalDistance += dist;
            
            // 判断是否跨层
            boolean crossFloor = !currentNode.getFloor().equals(nextNode.getFloor());
            
            String instruction = generateInstruction(currentNode, nextNode, crossFloor, edge);
            
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

        if (steps.isEmpty()) {
            return NavigationResult.error("Indoor path assembly failed");
        }

        return NavigationResult.success(steps, totalDistance, building.getFloorPlans(), path);
    }

    private Map<String, List<Edge>> buildGraph(IndoorBuilding building) {
        Map<String, List<Edge>> graph = new HashMap<>();

        // 添加同层边（双向）
        for (IndoorEdge edge : Optional.ofNullable(building.getEdges()).orElseGet(List::of)) {
            String from = normalizeNodeId(edge.getFrom());
            String to = normalizeNodeId(edge.getTo());
            graph.computeIfAbsent(from, k -> new ArrayList<>())
                .add(new Edge(to, edge.getDist(), edge.getType()));
            graph.computeIfAbsent(to, k -> new ArrayList<>())
                .add(new Edge(from, edge.getDist(), edge.getType()));
        }

        // 添加跨层边（双向）
        for (CrossFloorEdge edge : Optional.ofNullable(building.getCrossFloorEdges()).orElseGet(List::of)) {
            String from = normalizeNodeId(edge.getFrom());
            String to = normalizeNodeId(edge.getTo());
            graph.computeIfAbsent(from, k -> new ArrayList<>())
                .add(new Edge(to, edge.getDist(), edge.getType()));
            graph.computeIfAbsent(to, k -> new ArrayList<>())
                .add(new Edge(from, edge.getDist(), edge.getType()));
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
    
    private Edge findEdge(IndoorBuilding building, String from, String to) {
        String normalizedFrom = normalizeNodeId(from);
        String normalizedTo = normalizeNodeId(to);

        // 查找同层边
        for (IndoorEdge edge : Optional.ofNullable(building.getEdges()).orElseGet(List::of)) {
            if ((normalizeNodeId(edge.getFrom()).equals(normalizedFrom) && normalizeNodeId(edge.getTo()).equals(normalizedTo)) ||
                (normalizeNodeId(edge.getFrom()).equals(normalizedTo) && normalizeNodeId(edge.getTo()).equals(normalizedFrom))) {
                return new Edge(normalizedTo, edge.getDist(), edge.getType());
            }
        }

        // 查找跨层边
        for (CrossFloorEdge edge : Optional.ofNullable(building.getCrossFloorEdges()).orElseGet(List::of)) {
            if ((normalizeNodeId(edge.getFrom()).equals(normalizedFrom) && normalizeNodeId(edge.getTo()).equals(normalizedTo)) ||
                (normalizeNodeId(edge.getFrom()).equals(normalizedTo) && normalizeNodeId(edge.getTo()).equals(normalizedFrom))) {
                return new Edge(normalizedTo, edge.getDist(), edge.getType());
            }
        }

        return null;
    }

    private IndoorNode findNode(IndoorBuilding building, String nodeId) {
        String normalizedNodeId = normalizeNodeId(nodeId);
        for (IndoorNode node : Optional.ofNullable(building.getNodes()).orElseGet(List::of)) {
            if (normalizeNodeId(node.getId()).equals(normalizedNodeId)) {
                return node;
            }
        }
        return null;
    }

    private String normalizeNodeId(String nodeId) {
        return nodeId == null ? "" : nodeId.trim();
    }
    
    private String generateInstruction(IndoorNode from, IndoorNode to, boolean crossFloor, Edge edge) {
        if (crossFloor) {
            String edgeType = edge == null ? "" : safeUpper(edge.type);
            String method = "ELEVATOR".equals(edgeType) || "ELEVATOR".equals(safeUpper(from.getType())) || "ELEVATOR".equals(safeUpper(to.getType()))
                ? "乘电梯"
                : "走楼梯";
            String direction = floorOrder(to.getFloor()) > floorOrder(from.getFloor()) ? "上行" : "下行";
            return String.format("%s%s，从%s到%s。", method, direction, from.getFloor(), to.getFloor());
        }

        String toType = safeUpper(to.getType());
        String fromType = safeUpper(from.getType());
        String toName = displayName(to);

        if ("ROOM".equals(fromType) || "CLASSROOM".equals(fromType) || "LAB".equals(fromType) || "OFFICE".equals(fromType)) {
            return String.format("从%s出发，离开房间到门口。", displayName(from));
        }
        if ("ROOM".equals(toType) || "CLASSROOM".equals(toType) || "LAB".equals(toType) || "OFFICE".equals(toType)) {
            return String.format("到达%s门口，进入目标位置。", toName);
        }
        if ("DOOR".equals(toType)) {
            return String.format("到达%s。", toName);
        }
        if ("STAIRS".equals(toType)) {
            return String.format("前往%s，准备走楼梯。", toName);
        }
        if ("ELEVATOR".equals(toType)) {
            return String.format("前往%s，准备乘电梯。", toName);
        }
        if ("TOILET".equals(toType)) {
            return String.format("前往%s。", toName);
        }
        if ("EXIT".equals(toType) || "ENTRANCE".equals(toType)) {
            return String.format("前往%s。", toName);
        }

        String wingText = describeWing(to.getWing());
        String zoneText = describeZone(to.getZone());
        if (!wingText.isBlank() || !zoneText.isBlank()) {
            return String.format("沿%s%s走廊前进，经过%s。", wingText, zoneText, toName);
        }
        return String.format("沿走廊前往%s。", toName);
    }

    private static List<String> buildTextInstructions(List<NavigationStep> steps) {
        List<String> instructions = new ArrayList<>();
        String previous = "";
        for (NavigationStep step : steps) {
            if (step.instruction == null || step.instruction.equals(previous)) {
                continue;
            }
            instructions.add(step.instruction);
            previous = step.instruction;
        }
        return instructions;
    }

    private String displayName(IndoorNode node) {
        if (node == null) return "";
        if (node.getName() != null && !node.getName().isBlank()) return node.getName();
        return node.getId();
    }

    private String safeUpper(String value) {
        return value == null ? "" : value.toUpperCase(Locale.ROOT);
    }

    private int floorOrder(String floor) {
        if (floor == null || floor.length() < 2) return 0;
        try {
            int value = Integer.parseInt(floor.substring(1));
            return floor.startsWith("B") ? -value : value;
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private String describeWing(String wing) {
        if ("N".equalsIgnoreCase(wing)) return "北翼";
        if ("S".equalsIgnoreCase(wing)) return "南翼";
        if ("E".equalsIgnoreCase(wing) || "RIGHT".equalsIgnoreCase(wing)) return "东侧";
        if ("CENTER".equalsIgnoreCase(wing)) return "中部";
        return "";
    }

    private String describeZone(String zone) {
        if (zone == null || zone.isBlank()) return "";
        return switch (zone.toLowerCase(Locale.ROOT)) {
            case "west" -> "西段";
            case "mid", "middle" -> "中段";
            case "east" -> "东段";
            case "right-vertical", "vertical" -> "竖向连接区";
            case "stair-hall" -> "楼梯厅";
            default -> "";
        };
    }
    
    // 内部类
    private static class Edge {
        String to;
        double distance;
        String type;
        
        Edge(String to, double distance, String type) {
            this.to = to;
            this.distance = distance;
            this.type = type;
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
        public List<String> nodePath;
        public List<String> textInstructions;
        public double totalDistance;
        public Map<String, String> floorPlans;
        
        public static NavigationResult success(List<NavigationStep> steps, double totalDistance, Map<String, String> floorPlans, List<String> nodePath) {
            NavigationResult result = new NavigationResult();
            result.success = true;
            result.steps = steps;
            result.nodePath = nodePath;
            result.textInstructions = buildTextInstructions(steps);
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
        meta.floors = building.getFloors();
        return meta;
    }

    public static class BuildingMetadata {
        public List<IndoorNode> nodes;
        public List<IndoorEdge> edges;
        public List<CrossFloorEdge> crossFloorEdges;
        public java.util.Map<String, String> floorPlans;
        public List<String> floors;
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
