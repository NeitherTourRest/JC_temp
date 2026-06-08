package com.journeycraft.jc.ai.service;

import com.journeycraft.jc.diary.document.Diary;
import com.journeycraft.jc.diary.repository.DiaryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * AI日记总结服务 - 对已有旅行日记生成AI摘要
 * 
 * Harness工程:
 * - 从MongoDB读取日记
 * - 控制输入长度（只取前1000字）
 * - 结构化prompt
 * - 输出格式控制
 */
@Service
public class DiarySummaryService {

    private static final Logger log = LoggerFactory.getLogger(DiarySummaryService.class);
    private final DeepSeekClient deepSeek;
    private final DiaryRepository diaryRepository;

    private static final String SYSTEM_PROMPT = """
你是一个旅行日记总结助手。根据用户提供的日记内容，生成一个简洁的摘要。

输出格式：
📅 日期：[日期]
📍 地点：[目的地]
📝 摘要：[2-3句话的简洁总结]
⭐ 亮点：[1-2个最精彩的点]
💡 建议：[如果有的话，给其他旅行者的建议]

要求：
1. 摘要控制在100字以内
2. 突出有特色的内容
3. 语气温暖、积极
4. 如果日记中有实用信息（票价、路线等），在建议中突出
""";

    public DiarySummaryService(DeepSeekClient deepSeek, DiaryRepository diaryRepository) {
        this.deepSeek = deepSeek;
        this.diaryRepository = diaryRepository;
    }

    /**
     * 对单个日记生成AI总结
     */
    public SummaryResult summarizeDiary(String diaryId) {
        var diary = diaryRepository.findById(diaryId).orElse(null);
        if (diary == null) return new SummaryResult("", "日记未找到");

        return summarize(diary);
    }

    /**
     * 对所有公开日记生成AI总结
     */
    public SummaryResult summarizeLatest() {
        var diaries = diaryRepository.findByIsPublicTrue(
                org.springframework.data.domain.PageRequest.of(0, 1));
        if (diaries.isEmpty()) return new SummaryResult("", "暂无公开日记");

        var diary = diaries.getContent().get(0);
        return summarize(diary);
    }

    private SummaryResult summarize(Diary diary) {
        // 截断内容到1000字以内（控制token消耗）
        String content = diary.getContent();
        if (content.length() > 1000) content = content.substring(0, 1000) + "...";

        String dateStr = diary.getCreatedAt() != null ? diary.getCreatedAt().toString().substring(0, 10) : "未知日期";
        String dest = diary.getDestination() != null ? diary.getDestination() : "未知目的地";

        String userPrompt = String.format("""
日记标题：%s
日期：%s
目的地：%s
内容：
%s""", diary.getTitle(), dateStr, dest, content);

        String reply = deepSeek.chat(List.of(Map.of("role", "user", "content", userPrompt)), SYSTEM_PROMPT);
        return new SummaryResult(reply, null);
    }

    public record SummaryResult(String summary, String error) {}
}
