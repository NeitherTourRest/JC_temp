package com.journeycraft.jc.favorite.repository;

import com.journeycraft.jc.favorite.entity.Favorite;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    Page<Favorite> findByUserIdAndType(Long userId, String type, Pageable pageable);
    Page<Favorite> findByUserId(Long userId, Pageable pageable);
    Optional<Favorite> findByUserIdAndTypeAndTargetId(Long userId, String type, String targetId);
    void deleteByUserIdAndTypeAndTargetId(Long userId, String type, String targetId);
}
