package com.journeycraft.jc.history.repository;

import com.journeycraft.jc.history.entity.FacilityQueryHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FacilityQueryHistoryRepository extends JpaRepository<FacilityQueryHistory, Long> {
    Page<FacilityQueryHistory> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}
