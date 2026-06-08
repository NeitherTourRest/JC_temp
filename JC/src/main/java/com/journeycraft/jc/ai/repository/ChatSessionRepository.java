package com.journeycraft.jc.ai.repository;

import com.journeycraft.jc.ai.document.ChatSession;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatSessionRepository extends MongoRepository<ChatSession, String> {
    List<ChatSession> findByUserIdOrderByUpdatedAtDesc(Long userId);
    void deleteByUserIdAndId(Long userId, String sessionId);
}
