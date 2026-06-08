package com.journeycraft.jc.indoor.repository;

import com.journeycraft.jc.indoor.document.IndoorBuilding;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IndoorBuildingRepository extends MongoRepository<IndoorBuilding, String> {
    Optional<IndoorBuilding> findByBuildingId(String buildingId);
}
