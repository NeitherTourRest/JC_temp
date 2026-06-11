package com.journeycraft.jc.ai.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.InputStream;
import java.util.Properties;

@Configuration
public class AIConfig {

    private static final Logger log = LoggerFactory.getLogger(AIConfig.class);

    // DeepSeek
    private String deepseekApiKey = "";
    private String deepseekApiUrl = "https://api.deepseek.com/v1";
    private String deepseekModel = "deepseek-chat";

    // MiniMax
    private String minimaxApiKey = "";
    private String minimaxApiUrl = "https://api.minimaxi.com";

    @PostConstruct
    public void init() {
        try {
            InputStream is = new ClassPathResource("ai-api-key.properties").getInputStream();
            Properties props = new Properties();
            props.load(is);
            is.close();

            // DeepSeek
            this.deepseekApiKey = props.getProperty("deepseek.api.key", "").trim();
            this.deepseekApiUrl = props.getProperty("deepseek.api.url", "https://api.deepseek.com/v1").trim();
            this.deepseekModel = props.getProperty("deepseek.model", "deepseek-chat").trim();

            // MiniMax
            this.minimaxApiKey = props.getProperty("minimax.api.key", "").trim();
            this.minimaxApiUrl = props.getProperty("minimax.api.url", "https://api.minimax.io").trim();

            if (deepseekApiKey.isEmpty() || deepseekApiKey.equals("YOUR_DEEPSEEK_API_KEY_HERE")) {
                log.warn("DeepSeek API key not configured. AI features will be disabled.");
            } else {
                log.info("DeepSeek AI configured: model={}, apiKey={}...", deepseekModel, maskKey(deepseekApiKey));
            }

            if (minimaxApiKey.isEmpty() || minimaxApiKey.equals("YOUR_MINIMAX_API_KEY_HERE")) {
                log.warn("MiniMax API key not configured. Image/Video/Music generation will be disabled.");
            } else {
                log.info("MiniMax AI configured: apiKey={}...", maskKey(minimaxApiKey));
            }
        } catch (Exception e) {
            log.warn("ai-api-key.properties not found. AI features disabled. {}", e.getMessage());
        }
    }

    public String getDeepseekApiKey() { return deepseekApiKey; }
    public String getDeepseekApiUrl() { return deepseekApiUrl; }
    public String getDeepseekModel() { return deepseekModel; }
    public boolean isDeepseekEnabled() { return !deepseekApiKey.isEmpty() && !deepseekApiKey.equals("YOUR_DEEPSEEK_API_KEY_HERE"); }

    public String getMinimaxApiKey() { return minimaxApiKey; }
    public String getMinimaxApiUrl() { return minimaxApiUrl; }
    public boolean isMinimaxEnabled() { return !minimaxApiKey.isEmpty() && !minimaxApiKey.equals("YOUR_MINIMAX_API_KEY_HERE"); }

    private String maskKey(String key) {
        if (key.length() < 8) return "***";
        return key.substring(0, 4) + "..." + key.substring(key.length() - 4);
    }
}
