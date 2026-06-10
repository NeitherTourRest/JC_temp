package com.journeycraft.jc.common.repository;

import com.journeycraft.jc.common.entity.CongestionReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CongestionReportRepository extends JpaRepository<CongestionReport, Long> {

    List<CongestionReport> findByTargetTypeAndTargetId(String targetType, Long targetId);

    /** Native upsert: atomic insert-or-update using MySQL ON DUPLICATE KEY UPDATE */
    @Modifying
    @Query(value = """
        INSERT INTO congestion_reports (target_type, target_id, user_id, level, created_at)
        VALUES (:targetType, :targetId, :userId, :level, NOW())
        ON DUPLICATE KEY UPDATE level = :level, created_at = NOW()
        """, nativeQuery = true)
    void upsert(String targetType, Long targetId, Long userId, String level);
}
