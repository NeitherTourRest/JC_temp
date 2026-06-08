package com.journeycraft.jc.history.repository;

import com.journeycraft.jc.history.entity.RouteHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RouteHistoryRepository extends JpaRepository<RouteHistory, Long> {
    Page<RouteHistory> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}
