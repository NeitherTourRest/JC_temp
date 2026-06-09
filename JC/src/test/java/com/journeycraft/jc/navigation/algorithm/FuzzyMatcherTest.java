package com.journeycraft.jc.navigation.algorithm;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.util.List;

@DisplayName("FuzzyMatcher — Levenshtein distance and Trie prefix search")
class FuzzyMatcherTest {

    // ─── Levenshtein Distance ───

    @Test
    @DisplayName("levenshteinDistance returns 0 for identical strings")
    void levenshteinSame() {
        assertEquals(0, FuzzyMatcher.levenshteinDistance("hello", "hello"));
    }

    @Test
    @DisplayName("levenshteinDistance is correct for known cases")
    void levenshteinKnownCases() {
        assertEquals(3, FuzzyMatcher.levenshteinDistance("kitten", "sitting"));
        assertEquals(1, FuzzyMatcher.levenshteinDistance("pizza", "piza"));
        assertEquals(4, FuzzyMatcher.levenshteinDistance("", "test"));
        assertEquals(4, FuzzyMatcher.levenshteinDistance("test", ""));
    }

    @Test
    @DisplayName("levenshteinDistance is symmetric (commutative)")
    void levenshteinSymmetric() {
        assertEquals(
            FuzzyMatcher.levenshteinDistance("abcdef", "azcdef"),
            FuzzyMatcher.levenshteinDistance("azcdef", "abcdef")
        );
    }

    @Test
    @DisplayName("levenshteinDistance handles long strings efficiently")
    void levenshteinLongStrings() {
        String a = "a".repeat(1000);
        String b = "b".repeat(1000);
        long start = System.nanoTime();
        int dist = FuzzyMatcher.levenshteinDistance(a, b);
        long elapsed = System.nanoTime() - start;
        assertEquals(1000, dist);
        assertTrue(elapsed < 50_000_000, "1000-char Levenshtein should complete in <50ms");
    }

    // ─── matches ───

    @Test
    @DisplayName("matches returns true for exact match with maxDistance=0")
    void matchesExact() {
        assertTrue(FuzzyMatcher.matches("pizza", "pizza", 0));
    }

    @Test
    @DisplayName("matches returns true when edit distance <= maxDistance")
    void matchesFuzzyAllowed() {
        assertTrue(FuzzyMatcher.matches("pizza", "piza", 1));
        assertTrue(FuzzyMatcher.matches("restaurant", "resturant", 1));
    }

    @Test
    @DisplayName("matches returns false when edit distance > maxDistance")
    void matchesFuzzyTooFar() {
        assertFalse(FuzzyMatcher.matches("pizza", "burger", 2));
        assertFalse(FuzzyMatcher.matches("chinese", "japanese", 3));
    }

    @Test
    @DisplayName("matches is case-insensitive")
    void matchesCaseInsensitive() {
        assertTrue(FuzzyMatcher.matches("Pizza", "pizza", 0));
        assertTrue(FuzzyMatcher.matches("PIZZA", "pizza", 0));
    }

    @Test
    @DisplayName("matches returns false for null input")
    void matchesNull() {
        assertFalse(FuzzyMatcher.matches(null, "test", 1));
        assertFalse(FuzzyMatcher.matches("test", null, 1));
        assertFalse(FuzzyMatcher.matches(null, null, 1));
    }

    // ─── Trie ───

    @Test
    @DisplayName("Trie search by prefix finds matching words")
    void triePrefixSearch() {
        var trie = new FuzzyMatcher.Trie();
        trie.insert("apple");
        trie.insert("application");
        trie.insert("banana");
        trie.insert("appetizer");

        var results = trie.searchByPrefix("app", 10);
        assertEquals(3, results.size());
        assertTrue(results.contains("apple"));
        assertTrue(results.contains("application"));
        assertTrue(results.contains("appetizer"));
    }

    @Test
    @DisplayName("Trie search returns empty for no match")
    void trieNoMatch() {
        var trie = new FuzzyMatcher.Trie();
        trie.insert("apple");
        assertTrue(trie.searchByPrefix("xyz", 10).isEmpty());
    }

    @Test
    @DisplayName("Trie respects maxResults limit")
    void trieMaxResults() {
        var trie = new FuzzyMatcher.Trie();
        for (int i = 0; i < 100; i++) {
            trie.insert("word" + i);
        }
        var results = trie.searchByPrefix("word", 10);
        assertEquals(10, results.size());
    }

    @Test
    @DisplayName("Trie empty prefix returns all words up to maxResults")
    void trieEmptyPrefix() {
        var trie = new FuzzyMatcher.Trie();
        trie.insert("a");
        trie.insert("b");
        var results = trie.searchByPrefix("", 5);
        assertTrue(results.contains("a"));
        assertTrue(results.contains("b"));
    }

    @Test
    @DisplayName("Trie insert and search by prefix is case-insensitive")
    void trieCaseInsensitive() {
        var trie = new FuzzyMatcher.Trie();
        trie.insert("Apple");
        trie.insert("Banana");
        assertFalse(trie.searchByPrefix("app", 10).isEmpty());
        assertFalse(trie.searchByPrefix("APP", 10).isEmpty());
    }
}
