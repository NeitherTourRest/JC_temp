package com.journeycraft.jc.history.repository;

import com.journeycraft.jc.history.entity.SearchHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SearchHistoryRepository extends JpaRepository<SearchHistory, Long> {
    Page<SearchHistory> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}
