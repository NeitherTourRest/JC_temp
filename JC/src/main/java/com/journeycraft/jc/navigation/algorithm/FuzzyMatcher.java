package com.journeycraft.jc.navigation.algorithm;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Fuzzy string matching utility.
 * Implements Levenshtein edit distance for approximate matching
 * and a Trie for prefix-based suggestions.
 */
public class FuzzyMatcher {

    private FuzzyMatcher() {}

    /**
     * Checks if two strings match within the given max edit distance (Levenshtein).
     * Case-insensitive.
     */
    public static boolean matches(String source, String target, int maxDistance) {
        if (source == null || target == null) return false;
        String s = source.toLowerCase();
        String t = target.toLowerCase();
        return levenshteinDistance(s, t) <= maxDistance;
    }

    /**
     * Computes the Levenshtein edit distance between two strings.
     * Uses O(min(m,n)) space with rolling array optimization.
     */
    public static int levenshteinDistance(String a, String b) {
        if (a.isEmpty()) return b.length();
        if (b.isEmpty()) return a.length();

        // Ensure a is the shorter string for space optimization
        if (a.length() > b.length()) {
            String temp = a;
            a = b;
            b = temp;
        }

        int m = a.length();
        int n = b.length();
        int[] prev = new int[m + 1];
        int[] curr = new int[m + 1];

        for (int i = 0; i <= m; i++) prev[i] = i;

        for (int j = 1; j <= n; j++) {
            curr[0] = j;
            for (int i = 1; i <= m; i++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                curr[i] = Math.min(
                        Math.min(prev[i] + 1, curr[i - 1] + 1),
                        prev[i - 1] + cost);
            }
            int[] temp = prev;
            prev = curr;
            curr = temp;
        }
        return prev[m];
    }

    /**
     * Self-implemented Trie for prefix-based fuzzy search suggestions.
     */
    public static class Trie {
        private final TrieNode root = new TrieNode();

        public void insert(String word) {
            TrieNode node = root;
            for (char c : word.toLowerCase().toCharArray()) {
                node = node.children.computeIfAbsent(c, k -> new TrieNode());
            }
            node.isEndOfWord = true;
        }

        public List<String> searchByPrefix(String prefix, int maxResults) {
            List<String> results = new ArrayList<>();
            TrieNode node = root;
            for (char c : prefix.toLowerCase().toCharArray()) {
                node = node.children.get(c);
                if (node == null) return results;
            }
            collectWords(node, new StringBuilder(prefix.toLowerCase()), results, maxResults);
            return results;
        }

        private void collectWords(TrieNode node, StringBuilder prefix, List<String> results, int maxResults) {
            if (results.size() >= maxResults) return;
            if (node.isEndOfWord) {
                results.add(prefix.toString());
            }
            for (var entry : node.children.entrySet()) {
                prefix.append(entry.getKey());
                collectWords(entry.getValue(), prefix, results, maxResults);
                prefix.deleteCharAt(prefix.length() - 1);
            }
        }

        private static class TrieNode {
            Map<Character, TrieNode> children = new HashMap<>();
            boolean isEndOfWord;
        }
    }
}
