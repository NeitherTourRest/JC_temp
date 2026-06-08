package com.journeycraft.jc.navigation.algorithm;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Top-K selection algorithm using a self-implemented MinHeap.
 * Finds the top K elements from a collection based on a comparator.
 * Time complexity: O(N log K), Space complexity: O(K).
 */
public class TopKSorter {

    private TopKSorter() {}

    /**
     * Returns the top K elements from the list, sorted by the given comparator.
     * Uses a fixed-size min-heap internally.
     */
    public static <T> List<T> topK(List<T> items, int k, Comparator<T> comparator) {
        if (k <= 0 || items.isEmpty()) return List.of();
        if (k >= items.size()) {
            var sorted = new ArrayList<>(items);
            sorted.sort(comparator);
            return sorted;
        }

        var heap = new MinHeap<>(k, comparator);
        for (T item : items) {
            heap.insert(item);
        }

        var result = heap.toSortedList();
        // Result is in min-heap order (smallest first), reverse for descending
        var reversed = new ArrayList<T>();
        for (int i = result.size() - 1; i >= 0; i--) {
            reversed.add(result.get(i));
        }
        return reversed;
    }

    /**
     * Self-implemented MinHeap with fixed capacity.
     * After the heap reaches capacity, only elements larger than the min are inserted.
     */
    static class MinHeap<T> {
        private final Object[] heap;
        private final Comparator<T> comparator;
        private final int capacity;
        private int size;

        @SuppressWarnings("unchecked")
        MinHeap(int capacity, Comparator<T> comparator) {
            this.capacity = capacity;
            this.comparator = comparator;
            this.heap = new Object[capacity];
            this.size = 0;
        }

        void insert(T item) {
            if (size < capacity) {
                heap[size] = item;
                size++;
                siftUp(size - 1);
            } else if (comparator.compare(item, peek()) > 0) {
                heap[0] = item;
                siftDown(0);
            }
        }

        @SuppressWarnings("unchecked")
        T peek() {
            return (T) heap[0];
        }

        @SuppressWarnings("unchecked")
        List<T> toSortedList() {
            // Sort the heap array for stable output
            var list = new ArrayList<T>(size);
            for (int i = 0; i < size; i++) {
                list.add((T) heap[i]);
            }
            list.sort(comparator);
            return list;
        }

        @SuppressWarnings("unchecked")
        private void siftUp(int idx) {
            while (idx > 0) {
                int parent = (idx - 1) / 2;
                if (comparator.compare((T) heap[idx], (T) heap[parent]) < 0) {
                    swap(idx, parent);
                    idx = parent;
                } else {
                    break;
                }
            }
        }

        @SuppressWarnings("unchecked")
        private void siftDown(int idx) {
            int smallest = idx;
            int left = 2 * idx + 1;
            int right = 2 * idx + 2;

            if (left < size && comparator.compare((T) heap[left], (T) heap[smallest]) < 0) {
                smallest = left;
            }
            if (right < size && comparator.compare((T) heap[right], (T) heap[smallest]) < 0) {
                smallest = right;
            }
            if (smallest != idx) {
                swap(idx, smallest);
                siftDown(smallest);
            }
        }

        private void swap(int i, int j) {
            Object temp = heap[i];
            heap[i] = heap[j];
            heap[j] = temp;
        }
    }
}
