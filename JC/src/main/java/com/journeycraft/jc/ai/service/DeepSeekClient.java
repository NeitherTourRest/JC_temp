package com.journeycraft.jc.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.journeycraft.jc.ai.config.AIConfig;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * DeepSeek API client with harness engineering:
 * - Rate limiting (10 RPM per conversation)
 * - Retry with exponential backoff (max 3)
 * - Token management (max 4096 per response)
 * - Error recovery classification
 * - Request timeout (60s)
 */
@Service
public class DeepSeekClient {

    private static final Logger log = LoggerFactory.getLogger(DeepSeekClient.class);
    private final AIConfig aiConfig;
    private final ObjectMapper mapper = new ObjectMapper();

    private final HttpClient httpClient;
    private final RateLimiter rateLimiter = new RateLimiter(10, 60); // 10 requests per 60 seconds

    // Token tracking
    private final AtomicInteger totalTokensUsed = new AtomicInteger(0);
    private static final int MAX_RETRIES = 3;
    private static final int MAX_RESPONSE_TOKENS = 4096;
    private static final Duration TIMEOUT = Duration.ofSeconds(60);

    public DeepSeekClient(AIConfig aiConfig) {
        this.aiConfig = aiConfig;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    @PostConstruct
    public void init() {
        if (aiConfig.isDeepseekEnabled()) {
            log.info("DeepSeek client initialized (rate limit: 10/min, max retries: {})", MAX_RETRIES);
        }
    }

    /**
     * Send a chat completion request with full harness.
     *
     * @param messages  conversation messages (system + user + assistant)
     * @param systemPrompt the system-level prompt
     * @return the assistant's reply text, or error message
     */
    public String chat(List<Map<String, String>> messages, String systemPrompt) {
        if (!aiConfig.isDeepseekEnabled()) {
            return "【AI未配置】请先在 ai-api-key.properties 中配置 DeepSeek API Key。";
        }

        // Rate limiting
        if (!rateLimiter.tryAcquire()) {
            return "【请求太频繁】请稍后再试（每分钟限制10次请求）。";
        }

        // Build full message list with system prompt
        List<Map<String, String>> fullMessages = new ArrayList<>();
        fullMessages.add(Map.of("role", "system", "content", systemPrompt));
        fullMessages.addAll(messages);

        // Truncate conversation history if too long (keep last 10 messages)
        if (fullMessages.size() > 12) {
            int toRemove = fullMessages.size() - 12;
            // Keep system prompt, remove oldest user/assistant messages
            List<Map<String, String>> kept = new ArrayList<>();
            kept.add(fullMessages.get(0)); // system prompt
            kept.addAll(fullMessages.subList(toRemove + 1, fullMessages.size()));
            fullMessages = kept;
        }

        // Build request body
        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", aiConfig.getDeepseekModel());
        requestBody.put("messages", fullMessages);
        requestBody.put("max_tokens", MAX_RESPONSE_TOKENS);
        requestBody.put("temperature", 0.7);

        Exception lastError = null;

        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                String json = mapper.writeValueAsString(requestBody);
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(aiConfig.getDeepseekApiUrl() + "/chat/completions"))
                        .header("Content-Type", "application/json")
                        .header("Authorization", "Bearer " + aiConfig.getDeepseekApiKey())
                        .timeout(TIMEOUT)
                        .POST(HttpRequest.BodyPublishers.ofString(json))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                int statusCode = response.statusCode();
                String body = response.body();

                if (statusCode == 200) {
                    // Parse response
                    var root = mapper.readTree(body);
                    var choice = root.get("choices").get(0);
                    String reply = choice.get("message").get("content").asText();

                    // Track token usage
                    if (root.has("usage")) {
                        int tokens = root.get("usage").get("total_tokens").asInt();
                        totalTokensUsed.addAndGet(tokens);
                    }

                    return reply;
                } else if (statusCode == 429) {
                    // Rate limited by API - exponential backoff
                    log.warn("DeepSeek rate limited (attempt {}/{})", attempt, MAX_RETRIES);
                    Thread.sleep((long) Math.pow(2, attempt) * 1000);
                    lastError = new RuntimeException("Rate limited: " + body);
                } else if (statusCode == 401) {
                    return "【认证失败】DeepSeek API Key 无效，请检查 ai-api-key.properties。";
                } else if (statusCode >= 500) {
                    // Server error - retry
                    log.warn("DeepSeek server error {} (attempt {}/{})", statusCode, attempt, MAX_RETRIES);
                    Thread.sleep((long) Math.pow(2, attempt) * 1000);
                    lastError = new RuntimeException("Server error: " + statusCode);
                } else {
                    return "【API错误】HTTP " + statusCode + ": " + body;
                }

            } catch (Exception e) {
                lastError = e;
                if (attempt < MAX_RETRIES) {
                    log.warn("DeepSeek request failed (attempt {}/{}): {}", attempt, MAX_RETRIES, e.getMessage());
                    try { Thread.sleep((long) Math.pow(2, attempt) * 1000); } catch (InterruptedException ie) { break; }
                }
            }
        }

        log.error("DeepSeek request failed after {} retries: {}", MAX_RETRIES, lastError != null ? lastError.getMessage() : "unknown");
        return "【请求失败】AI服务暂时不可用，请稍后重试。";
    }

    /**
     * Token statistics
     */
    public int getTotalTokensUsed() { return totalTokensUsed.get(); }

    /**
     * Simple rate limiter: sliding window
     */
    static class RateLimiter {
        private final int maxRequests;
        private final long windowSeconds;
        private final Queue<Long> timestamps = new ConcurrentLinkedQueue<>();

        RateLimiter(int maxRequests, long windowSeconds) {
            this.maxRequests = maxRequests;
            this.windowSeconds = windowSeconds;
        }

        synchronized boolean tryAcquire() {
            long now = System.currentTimeMillis();
            long cutoff = now - windowSeconds * 1000;
            while (!timestamps.isEmpty() && timestamps.peek() < cutoff) {
                timestamps.poll();
            }
            if (timestamps.size() >= maxRequests) return false;
            timestamps.offer(now);
            return true;
        }
    }
}
