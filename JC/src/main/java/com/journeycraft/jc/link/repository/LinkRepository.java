package com.journeycraft.jc.link.repository;

import com.journeycraft.jc.link.entity.TravelServiceLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LinkRepository extends JpaRepository<TravelServiceLink, Long> {
    List<TravelServiceLink> findBySpotId(Long spotId);
    List<TravelServiceLink> findBySpotIdAndType(Long spotId, String type);
}
