package com.journeycraft.jc.diary.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.DataFormatException;
import java.util.zip.Deflater;
import java.util.zip.Inflater;

/**
 * 游记内容无损压缩工具。
 * 
 * 使用 java.util.zip.Deflater（LZ77 + Huffman 编码，同 GZIP 核心算法），
 * 支持可调压缩级别 1~9，零外部依赖。
 * 
 * 压缩比预期：
 *   Level 1（最快）: ~2-3x
 *   Level 6（默认）: ~4-6x
 *   Level 9（最大）: ~5-8x
 */
public class DiaryCompressor {

    private static final Logger log = LoggerFactory.getLogger(DiaryCompressor.class);

    /** 默认压缩级别 */
    public static final int DEFAULT_LEVEL = 6;

    private DiaryCompressor() {}

    /**
     * 压缩结果。
     */
    public record CompressResult(
        int originalSize,
        byte[] compressedData,
        int compressedSize,
        int level,
        double ratio
    ) {
        public CompressResult(int originalSize, byte[] compressedData, int level) {
            this(originalSize, compressedData, compressedData.length, level,
                 compressedData.length > 0 ? (double) compressedData.length / originalSize : 1.0);
        }
    }

    /**
     * 压缩文本内容。
     *
     * @param text  待压缩的 UTF-8 文本
     * @param level 压缩级别 1~9（1=最快, 9=最大压缩）
     * @return CompressResult
     * @throws IllegalArgumentException 如果 text 为 null 或 level 超出范围
     */
    public static CompressResult compress(String text, int level) {
        if (text == null) {
            throw new IllegalArgumentException("text must not be null");
        }
        if (level < Deflater.BEST_SPEED || level > Deflater.BEST_COMPRESSION) {
            throw new IllegalArgumentException("level must be between " + Deflater.BEST_SPEED
                                               + " and " + Deflater.BEST_COMPRESSION);
        }

        byte[] input = text.getBytes(StandardCharsets.UTF_8);
        int originalSize = input.length;

        Deflater deflater = new Deflater(level, true); // true = nowrap (raw Deflate, no GZIP header)
        deflater.setInput(input);
        deflater.finish();

        ByteArrayOutputStream bos = new ByteArrayOutputStream(input.length);
        byte[] buf = new byte[8192];
        while (!deflater.finished()) {
            int len = deflater.deflate(buf);
            bos.write(buf, 0, len);
        }
        deflater.end();

        byte[] compressed = bos.toByteArray();
        return new CompressResult(originalSize, compressed, level);
    }

    /**
     * 使用默认级别压缩。
     */
    public static CompressResult compress(String text) {
        return compress(text, DEFAULT_LEVEL);
    }

    /**
     * 解压数据。
     *
     * @param compressedData 压缩后的字节数组
     * @param originalSize   原始大小（用于预分配缓冲区，可传 0）
     * @return 解压后的文本
     * @throws DataFormatException 如果数据损坏
     */
    public static String decompress(byte[] compressedData, int originalSize) throws DataFormatException {
        if (compressedData == null || compressedData.length == 0) {
            return "";
        }

        Inflater inflater = new Inflater(true); // true = nowrap
        inflater.setInput(compressedData);

        ByteArrayOutputStream bos = new ByteArrayOutputStream(Math.max(originalSize, 4096));
        byte[] buf = new byte[8192];
        while (!inflater.finished()) {
            int len = inflater.inflate(buf);
            if (len == 0) break; // prevent infinite loop on corrupt data
            bos.write(buf, 0, len);
        }
        inflater.end();

        return bos.toString(StandardCharsets.UTF_8);
    }

    /**
     * 测试并打印不同级别的压缩效果（用于演示）。
     */
    public static void benchmark(String text) {
        log.info("===== DiaryCompressor Benchmark =====");
        log.info("Original size: {} bytes", text.getBytes(StandardCharsets.UTF_8).length);

        for (int level = 1; level <= 9; level++) {
            long start = System.nanoTime();
            CompressResult result = compress(text, level);
            long elapsed = System.nanoTime() - start;

            log.info("Level {}: {} bytes -> {} bytes (ratio: {}x, time: {} μs)",
                level, result.originalSize(), result.compressedSize(),
                String.format("%.2f", result.ratio()), elapsed / 1000);
        }
    }
}
