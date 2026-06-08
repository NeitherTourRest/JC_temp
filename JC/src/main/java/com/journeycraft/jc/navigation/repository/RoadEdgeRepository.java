package com.journeycraft.jc.navigation.repository;

import com.journeycraft.jc.navigation.entity.RoadEdge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoadEdgeRepository extends JpaRepository<RoadEdge, Long> {
    List<RoadEdge> findByFromNodeId(String fromNodeId);
    List<RoadEdge> findByFromNodeIdIn(List<String> fromNodeIds);
}
