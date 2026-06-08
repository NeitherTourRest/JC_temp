package com.journeycraft.jc.ai.service;

import com.journeycraft.jc.ai.document.ChatSession;
import com.journeycraft.jc.ai.repository.ChatSessionRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class AIChatService {

    private final DeepSeekClient deepSeek;
    private final ChatSessionRepository sessionRepo;

    private static final String SYSTEM_PROMPT = """
你是一个专业、友善的北京昌平区旅行规划助手"JourneyCraft AI"。
你的知识范围包括：昌平区的景点（十三陵、居庸关长城、蟒山森林公园等）、美食、交通路线、行程规划建议。

回答规则：
1. 回答要简洁实用，控制在200字以内。
2. 基于真实景点信息回答。
3. 使用友好、热情的语气。
""";

    public AIChatService(DeepSeekClient deepSeek, ChatSessionRepository sessionRepo) {
        this.deepSeek = deepSeek;
        this.sessionRepo = sessionRepo;
    }

    public ChatResult sendMessage(String sessionId, Long userId, String message) {
        ChatSession session = sessionRepo.findById(sessionId).orElseGet(() -> {
            var s = ChatSession.builder()
                    .userId(userId).title(message.length() > 30 ? message.substring(0, 30) + "..." : message)
                    .messages(new ArrayList<>()).createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                    .build();
            return sessionRepo.save(s);
        });

        session.getMessages().add(new ChatSession.ChatMessage("user", message, LocalDateTime.now()));
        session.setUpdatedAt(LocalDateTime.now());
        if (session.getMessages().size() == 2) session.setTitle(message.length() > 40 ? message.substring(0, 40) + "..." : message);

        // 截断历史保留20条
        if (session.getMessages().size() > 22) {
            session.getMessages().subList(0, session.getMessages().size() - 22).clear();
        }

        var messages = new ArrayList<Map<String, String>>();
        for (var m : session.getMessages())
            messages.add(Map.of("role", m.getRole(), "content", m.getContent()));

        String reply = deepSeek.chat(messages, SYSTEM_PROMPT);
        session.getMessages().add(new ChatSession.ChatMessage("assistant", reply, LocalDateTime.now()));
        session.setUpdatedAt(LocalDateTime.now());
        sessionRepo.save(session);

        return new ChatResult(reply, session.getMessages().size() / 2, session.getId(), session.getTitle());
    }

    public List<ChatSession> listSessions(Long userId) {
        return sessionRepo.findByUserIdOrderByUpdatedAtDesc(userId);
    }

    public Optional<ChatSession> getSession(String sessionId) {
        return sessionRepo.findById(sessionId);
    }

    public void deleteSession(Long userId, String sessionId) {
        sessionRepo.deleteByUserIdAndId(userId, sessionId);
    }

    public record ChatResult(String reply, int turnCount, String sessionId, String title) {}
}
