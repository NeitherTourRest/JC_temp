package com.journeycraft.jc.spot.repository;

import com.journeycraft.jc.spot.entity.CongestionReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CongestionReportRepository extends JpaRepository<CongestionReport, Long> {
    List<CongestionReport> findBySpotIdOrderByCreatedAtDesc(Long spotId);
    List<CongestionReport> findBySpotIdAndCreatedAtAfterOrderByCreatedAtDesc(Long spotId, LocalDateTime after);
}
