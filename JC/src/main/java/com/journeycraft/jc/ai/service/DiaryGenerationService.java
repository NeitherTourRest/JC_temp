package com.journeycraft.jc.ai.service;

import com.journeycraft.jc.itinerary.entity.Itinerary;
import com.journeycraft.jc.itinerary.repository.ItineraryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * AI日记文本生成服务
 * - 根据用户提示词和/或已有行程生成游记文本
 * - 原始文本返回，前端负责排版
 */
@Service
public class DiaryGenerationService {

    private static final Logger log = LoggerFactory.getLogger(DiaryGenerationService.class);
    private final DeepSeekClient deepSeek;
    private final ItineraryRepository itineraryRepository;

    private static final String SYSTEM_PROMPT = """
你是一个旅行日记写作助手，帮助用户撰写生动的旅行日记。

根据用户提供的提示词或行程信息，生成一篇完整的游记。

写作要求：
1. 用第一人称，语气真实亲切
2. 描述沿途见闻、感受、小故事
3. 包含具体的地点和活动描述
4. 语言生动但不浮夸
5. 字数在300-800字之间
6. 如果提供了行程信息，按照行程的时间顺序组织内容
7. 不要使用Markdown格式，直接返回纯文本段落
8. 段落之间用空行分隔

请直接输出游记文本，不要加任何开头说明。""";

    public DiaryGenerationService(DeepSeekClient deepSeek, ItineraryRepository itineraryRepository) {
        this.deepSeek = deepSeek;
        this.itineraryRepository = itineraryRepository;
    }

    /**
     * 生成游记文本
     * @param prompt 用户自定义提示词（可选）
     * @param itineraryId 关联的行程ID（可选）
     * @return 生成的游记文本
     */
    public String generate(String prompt, Long itineraryId) {
        StringBuilder userPrompt = new StringBuilder();

        // 如果有行程，先加载行程信息
        if (itineraryId != null) {
            var itinerary = itineraryRepository.findById(itineraryId).orElse(null);
            if (itinerary != null) {
                userPrompt.append("以下是我的一次旅行行程：\n");
                userPrompt.append("行程名称：").append(itinerary.getName()).append("\n");
                if (itinerary.getRouteData() != null) {
                    // 截取行程数据的前1000字作为参考
                    String routeData = itinerary.getRouteData();
                    if (routeData.length() > 1000) routeData = routeData.substring(0, 1000) + "...";
                    userPrompt.append("行程详情：").append(routeData).append("\n");
                }
                if (itinerary.getSpotIds() != null) {
                    userPrompt.append("关联景点：").append(itinerary.getSpotIds()).append("\n");
                }
                userPrompt.append("\n");
            } else {
                userPrompt.append("（选择的行程未找到）\n");
            }
        }

        // 添加用户提示词
        if (prompt != null && !prompt.isBlank()) {
            userPrompt.append("用户要求：").append(prompt).append("\n");
        } else if (itineraryId == null) {
            userPrompt.append("请写一篇在北京昌平区游玩的旅行日记。\n");
        }

        String result = deepSeek.chat(
                List.of(Map.of("role", "user", "content", userPrompt.toString())),
                SYSTEM_PROMPT
        );

        // 清理可能的Markdown代码块标记
        result = result.replaceAll("```[a-zA-Z]*\\s*", "").trim();
        return result;
    }

    public record GenerateRequest(String prompt, Long itineraryId) {}
    public record GenerateResult(String text) {}
}
