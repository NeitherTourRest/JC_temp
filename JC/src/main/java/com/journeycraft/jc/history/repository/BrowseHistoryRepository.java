package com.journeycraft.jc.history.repository;

import com.journeycraft.jc.history.entity.BrowseHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BrowseHistoryRepository extends JpaRepository<BrowseHistory, Long> {
    Page<BrowseHistory> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    Page<BrowseHistory> findByUserIdAndTypeOrderByCreatedAtDesc(Long userId, String type, Pageable pageable);
}
