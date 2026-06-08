package com.journeycraft.jc.ai.service;

import com.journeycraft.jc.ai.config.AIConfig;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * MiniMax AI client for image, video, and music generation.
 */
@Service
@RequiredArgsConstructor
public class MiniMaxClient {

    private static final Logger log = LoggerFactory.getLogger(MiniMaxClient.class);
    private final AIConfig aiConfig;
    private final RestTemplate restTemplate = new RestTemplate();

    public boolean isAvailable() {
        return aiConfig.isMinimaxEnabled();
    }

    // ── Image Generation ──
    public MiniMaxImageResult generateImage(String prompt, String aspectRatio) {
        if (!isAvailable()) return errorResult("MiniMax not configured. Set minimax.api.key in ai-api-key.properties");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", "image-01");
        body.put("prompt", prompt);
        body.put("aspect_ratio", aspectRatio != null ? aspectRatio : "1:1");
        body.put("n", 1);
        body.put("response_format", "url");

        try {
            Map<String, Object> resp = postForMap("/v1/image_generation", body);
            Map<String, Object> baseResp = (Map<String, Object>) resp.get("base_resp");
            if (baseResp != null && Integer.valueOf(0).equals(baseResp.get("status_code"))) {
                @SuppressWarnings("unchecked")
                var data = (Map<String, Object>) resp.get("data");
                if (data != null) {
                    @SuppressWarnings("unchecked")
                    var urls = (List<String>) data.get("image_urls");
                    if (urls != null && !urls.isEmpty()) {
                        return new MiniMaxImageResult(true, urls.get(0), null, null);
                    }
                }
            }
            String msg = baseResp != null ? String.valueOf(baseResp.get("status_msg")) : "unknown error";
            return errorResult("Image generation failed: " + msg);
        } catch (Exception e) {
            log.error("Image generation error", e);
            return errorResult(e.getMessage());
        }
    }

    // ── Video Generation (async) ──
    public MiniMaxVideoResult createVideoTask(String prompt) {
        if (!isAvailable()) return errorVideoResult("MiniMax not configured");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", "MiniMax-Hailuo-02");
        body.put("prompt", prompt);
        body.put("duration", 6);
        body.put("resolution", "768P");

        try {
            Map<String, Object> resp = postForMap("/v1/video_generation", body);
            Map<String, Object> baseResp = (Map<String, Object>) resp.get("base_resp");
            if (baseResp != null && Integer.valueOf(0).equals(baseResp.get("status_code"))) {
                String taskId = (String) resp.get("task_id");
                return new MiniMaxVideoResult(true, "Processing", taskId, null);
            }
            String msg = baseResp != null ? String.valueOf(baseResp.get("status_msg")) : "unknown error";
            return errorVideoResult("Video task creation failed: " + msg);
        } catch (Exception e) {
            log.error("Video generation error", e);
            return errorVideoResult(e.getMessage());
        }
    }

    public MiniMaxVideoResult queryVideoTask(String taskId) {
        try {
            String url = aiConfig.getMinimaxApiUrl() + "/v1/query/video_generation?task_id=" + taskId;
            HttpHeaders headers = buildHeaders();
            var resp = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            var body = resp.getBody();
            if (body != null) {
                String status = (String) body.get("status");
                String fileId = body.get("file_id") != null ? String.valueOf(body.get("file_id")) : null;
                return new MiniMaxVideoResult("Success".equalsIgnoreCase(status), status, taskId, fileId);
            }
            return errorVideoResult("No response");
        } catch (Exception e) {
            log.error("Query video task error", e);
            return errorVideoResult(e.getMessage());
        }
    }

    public String getVideoDownloadUrl(String fileId) {
        try {
            String url = aiConfig.getMinimaxApiUrl() + "/v1/files/retrieve?file_id=" + fileId;
            HttpHeaders headers = buildHeaders();
            var resp = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            var body = resp.getBody();
            if (body != null) {
                @SuppressWarnings("unchecked")
                var file = (Map<String, Object>) body.get("file");
                if (file != null) return (String) file.get("download_url");
            }
            return null;
        } catch (Exception e) {
            log.error("Get video download URL error", e);
            return null;
        }
    }

    // ── Music Generation ──
    public MiniMaxMusicResult generateMusic(String prompt, String lyrics, boolean instrumental) {
        if (!isAvailable()) return errorMusicResult("MiniMax not configured");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", "music-2.6-free");
        body.put("prompt", prompt);
        if (lyrics != null && !lyrics.isEmpty()) body.put("lyrics", lyrics);
        body.put("is_instrumental", instrumental);
        body.put("output_format", "url");
        body.put("audio_setting", Map.of("sample_rate", 44100, "bitrate", 256000, "format", "mp3"));

        try {
            Map<String, Object> resp = postForMap("/v1/music_generation", body);
            Map<String, Object> baseResp = (Map<String, Object>) resp.get("base_resp");
            if (baseResp != null && Integer.valueOf(0).equals(baseResp.get("status_code"))) {
                @SuppressWarnings("unchecked")
                var data = (Map<String, Object>) resp.get("data");
                String audioUrl = data != null ? (String) data.get("audio_url") : null;
                return new MiniMaxMusicResult(true, audioUrl, null, null);
            }
            String msg = baseResp != null ? String.valueOf(baseResp.get("status_msg")) : "unknown error";
            return errorMusicResult("Music generation failed: " + msg);
        } catch (Exception e) {
            log.error("Music generation error", e);
            return errorMusicResult(e.getMessage());
        }
    }

    // ── Internal helpers ──
    @SuppressWarnings("unchecked")
    private Map<String, Object> postForMap(String path, Map<String, Object> body) {
        String url = aiConfig.getMinimaxApiUrl() + path;
        HttpHeaders headers = buildHeaders();
        var entity = new HttpEntity<>(body, headers);
        var resp = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
        return resp.getBody() != null ? resp.getBody() : Map.of();
    }

    private HttpHeaders buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(aiConfig.getMinimaxApiKey());
        return headers;
    }

    private MiniMaxImageResult errorResult(String msg) {
        return new MiniMaxImageResult(false, null, msg, null);
    }

    private MiniMaxVideoResult errorVideoResult(String msg) {
        return new MiniMaxVideoResult(false, msg, null, null);
    }

    private MiniMaxMusicResult errorMusicResult(String msg) {
        return new MiniMaxMusicResult(false, null, msg, null);
    }

    // ── Result classes ──
    public record MiniMaxImageResult(boolean success, String imageUrl, String error, Object raw) {}
    public record MiniMaxVideoResult(boolean success, String status, String taskId, String fileId) {}
    public record MiniMaxMusicResult(boolean success, String audioUrl, String error, Object raw) {}
}