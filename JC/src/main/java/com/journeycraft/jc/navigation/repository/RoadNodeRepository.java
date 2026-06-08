package com.journeycraft.jc.navigation.repository;

import com.journeycraft.jc.navigation.entity.RoadNode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RoadNodeRepository extends JpaRepository<RoadNode, String> {
}
