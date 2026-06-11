package com.journeycraft.jc.diary.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.nio.charset.StandardCharsets;
import java.util.zip.Deflater;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("DiaryCompressor — Deflate compression/decompression")
class DiaryCompressorTest {

    private static final String SHORT_TEXT = "Hello, JourneyCraft!";
    private static final String LONG_TEXT = """
            JourneyCraft is an intelligent campus trip planner with indoor navigation and AI-powered features.
            It helps users plan trips, navigate indoor spaces, discover spots and dining options,
            generate AI-powered travel diaries, and collaborate on itineraries.
            """.repeat(50);  // ~5000 chars

    @Test
    @DisplayName("compress and decompress roundtrip preserves original text")
    void roundtrip() throws Exception {
        var result = DiaryCompressor.compress(LONG_TEXT);
        String decompressed = DiaryCompressor.decompress(result.compressedData(), result.originalSize());
        assertEquals(LONG_TEXT, decompressed);
    }

    @Test
    @DisplayName("compressed data is smaller than original for reasonable input")
    void compressedIsSmaller() {
        var result = DiaryCompressor.compress(LONG_TEXT);
        assertTrue(result.compressedSize() < result.originalSize(),
                "Compressed size " + result.compressedSize() + " should be < original " + result.originalSize());
    }

    @Test
    @DisplayName("compression ratio is at least 2x for repetitive text")
    void compressionRatio() {
        var result = DiaryCompressor.compress(LONG_TEXT);
        assertTrue(result.ratio() < 0.5,
                "Ratio " + result.ratio() + " should be < 0.5");
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 3, 6, 9})
    @DisplayName("all compression levels 1-9 produce valid output")
    void allLevels(int level) throws Exception {
        var result = DiaryCompressor.compress(LONG_TEXT, level);
        String decompressed = DiaryCompressor.decompress(result.compressedData(), result.originalSize());
        assertEquals(LONG_TEXT, decompressed);
        assertTrue(result.compressedSize() < result.originalSize(),
                "Level " + level + " should compress");
    }

    @Test
    @DisplayName("level 9 compresses better than level 1")
    void level9BetterThan1() {
        var r1 = DiaryCompressor.compress(LONG_TEXT, Deflater.BEST_SPEED);
        var r9 = DiaryCompressor.compress(LONG_TEXT, Deflater.BEST_COMPRESSION);
        assertTrue(r9.compressedSize() <= r1.compressedSize(),
                "Level 9 (" + r9.compressedSize() + ") should compress at least as well as level 1 ("
                        + r1.compressedSize() + ")");
    }

    @Test
    @DisplayName("short text still roundtrips correctly")
    void shortText() throws Exception {
        var result = DiaryCompressor.compress(SHORT_TEXT);
        String decompressed = DiaryCompressor.decompress(result.compressedData(), result.originalSize());
        assertEquals(SHORT_TEXT, decompressed);
    }

    @Test
    @DisplayName("empty string roundtrips to empty")
    void emptyString() throws Exception {
        var result = DiaryCompressor.compress("");
        assertEquals(0, result.originalSize());
        String decompressed = DiaryCompressor.decompress(result.compressedData(), 0);
        assertEquals("", decompressed);
    }

    @Test
    @DisplayName("null input throws IllegalArgumentException")
    void nullInput() {
        assertThrows(IllegalArgumentException.class, () -> DiaryCompressor.compress(null));
    }

    @Test
    @DisplayName("invalid level throws IllegalArgumentException")
    void invalidLevel() {
        assertThrows(IllegalArgumentException.class, () -> DiaryCompressor.compress("test", 0));
        assertThrows(IllegalArgumentException.class, () -> DiaryCompressor.compress("test", 10));
    }

    @Test
    @DisplayName("decompress null returns empty string")
    void decompressNull() throws Exception {
        assertEquals("", DiaryCompressor.decompress(null, 0));
        assertEquals("", DiaryCompressor.decompress(new byte[0], 0));
    }

    @Test
    @DisplayName("benchmark runs without throwing")
    void benchmark() {
        assertDoesNotThrow(() -> DiaryCompressor.benchmark(LONG_TEXT));
    }

    @Test
    @DisplayName("default level constants are valid")
    void defaultLevel() {
        assertEquals(6, DiaryCompressor.DEFAULT_LEVEL);
        var result = DiaryCompressor.compress(LONG_TEXT);
        assertEquals(6, result.level());
    }
}
