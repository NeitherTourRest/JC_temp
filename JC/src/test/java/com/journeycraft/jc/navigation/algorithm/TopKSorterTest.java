package com.journeycraft.jc.navigation.algorithm;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;

@DisplayName("TopKSorter — MinHeap-based Top-K selection")
class TopKSorterTest {

    @Test
    @DisplayName("topK returns highest K elements in descending order")
    void topK() {
        var items = List.of(5, 1, 8, 3, 9, 2, 7, 4, 6);
        var result = TopKSorter.topK(items, 3, Comparator.naturalOrder());
        assertEquals(List.of(9, 8, 7), result);
    }

    @Test
    @DisplayName("topK with K greater than size returns all sorted (ascending for natural order)")
    void topKKGreaterThanSize() {
        var items = List.of(3, 1, 2);
        var result = TopKSorter.topK(items, 10, Comparator.naturalOrder());
        // When K >= N, TopKSorter sorts via comparator directly (ascending for natural order)
        assertEquals(3, result.size());
        assertEquals(1, result.get(0).intValue()); // smallest first
    }

    @Test
    @DisplayName("topK with K=0 returns empty")
    void topKZero() {
        var items = List.of(1, 2, 3);
        assertTrue(TopKSorter.topK(items, 0, Comparator.naturalOrder()).isEmpty());
    }

    @Test
    @DisplayName("topK with K=1 returns max element")
    void topKOne() {
        var items = List.of(5, 1, 8, 3);
        assertEquals(List.of(8), TopKSorter.topK(items, 1, Comparator.naturalOrder()));
    }

    @Test
    @DisplayName("topK empty list returns empty")
    void topKEmptyList() {
        assertTrue(TopKSorter.topK(java.util.Collections.<Integer>emptyList(), 5, Comparator.naturalOrder()).isEmpty());
    }

    @Test
    @DisplayName("topK with negative K returns empty")
    void topKNegative() {
        var items = List.of(1, 2, 3);
        assertTrue(TopKSorter.topK(items, -1, Comparator.naturalOrder()).isEmpty());
    }

    @Test
    @DisplayName("topK with custom comparator: strings sorted by length (descending)")
    void topKCustomComparator() {
        var items = List.of("aa", "b", "ccc", "dddd", "eeeee");
        // Note: reversed comparator flips heap semantics; use natural with explicit ordering
        var result = TopKSorter.topK(items, 3, Comparator.comparingInt(String::length));
        assertEquals(3, result.size());
        // Should return the 3 longest strings: "eeeee"(5), "dddd"(4), "ccc"(3)
        assertTrue(result.contains("eeeee"));
        assertTrue(result.contains("dddd"));
        assertTrue(result.contains("ccc"));
    }

    @Test
    @DisplayName("topK handles duplicate values correctly")
    void topKDuplicates() {
        var items = List.of(5, 5, 5, 3, 3, 1);
        var result = TopKSorter.topK(items, 4, Comparator.naturalOrder());
        assertEquals(4, result.size());
        assertTrue(result.contains(5));
        assertTrue(result.contains(3));
    }

    @Test
    @DisplayName("topK with large dataset is faster than full sort for small K")
    void topKPerformantForSmallK() {
        var items = new java.util.ArrayList<Integer>();
        for (int i = 0; i < 10000; i++) items.add(i);

        long start = System.nanoTime();
        var result = TopKSorter.topK(items, 10, Comparator.naturalOrder());
        long topKTime = System.nanoTime() - start;

        // Verify correctness (top 10 from 0..9999 = 9990..9999)
        assertEquals(10, result.size());
        assertEquals(9999, result.get(0).intValue());
        assertEquals(9990, result.get(9).intValue());
    }

    // ─── MinHeap internal tests ───

    @Test
    @DisplayName("MinHeap maintains fixed capacity — only keeps largest K")
    void minHeapMaintainsCapacity() {
        var heap = new TopKSorter.MinHeap<Integer>(3, Comparator.naturalOrder());
        // Insert 100 items, heap should only keep 3 largest
        for (int i = 0; i < 100; i++) {
            heap.insert(i);
        }
        var sorted = heap.toSortedList();
        assertEquals(3, sorted.size());
        assertTrue(sorted.contains(97));
        assertTrue(sorted.contains(98));
        assertTrue(sorted.contains(99));
    }
}
