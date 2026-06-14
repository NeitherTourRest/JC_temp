package com.journeycraft.jc.shop.repository;

import com.journeycraft.jc.shop.entity.Shop;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShopRepository extends JpaRepository<Shop, Long> {

    @Query("SELECT s FROM Shop s WHERE LOWER(s.cuisine) LIKE LOWER(CONCAT('%', :cuisine, '%'))")
    Page<Shop> findByCuisine(@Param("cuisine") String cuisine, Pageable pageable);

    @Query("SELECT s FROM Shop s WHERE LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.address) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.description) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Shop> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT s FROM Shop s WHERE (LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.address) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.description) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND LOWER(s.cuisine) LIKE LOWER(CONCAT('%', :cuisine, '%'))")
    Page<Shop> searchByKeywordAndCuisine(@Param("keyword") String keyword, @Param("cuisine") String cuisine, Pageable pageable);

    List<Shop> findBySpotId(Long spotId);

    List<Shop> findTop20ByOrderByPopularityDesc();
}
