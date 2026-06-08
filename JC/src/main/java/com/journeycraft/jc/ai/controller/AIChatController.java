package com.journeycraft.jc.ai.controller;

import com.journeycraft.jc.ai.document.ChatSession;
import com.journeycraft.jc.ai.service.AIChatService;
import com.journeycraft.jc.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AIChatController {

    private final AIChatService chatService;

    @PostMapping("/chat")
    public ResponseEntity<ApiResponse<Map<String, Object>>> chat(
            @RequestParam String sessionId,
            @RequestParam(required = false, defaultValue = "0") Long userId,
            @RequestBody Map<String, String> body) {
        String message = body.get("message");
        if (message == null || message.isBlank())
            return ResponseEntity.badRequest().body(ApiResponse.error("消息不能为空"));
        var result = chatService.sendMessage(sessionId, userId, message);
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "reply", result.reply(),
                "turnCount", result.turnCount(),
                "sessionId", result.sessionId(),
                "title", result.title()
        )));
    }

    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<List<ChatSession>>> listSessions(
            @RequestParam(defaultValue = "0") Long userId) {
        return ResponseEntity.ok(ApiResponse.success(chatService.listSessions(userId)));
    }

    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<ChatSession>> getSession(@PathVariable String sessionId) {
        return ResponseEntity.ok(ApiResponse.success(
                chatService.getSession(sessionId).orElse(null)));
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<Void>> deleteSession(
            @PathVariable String sessionId,
            @RequestParam(defaultValue = "0") Long userId) {
        chatService.deleteSession(userId, sessionId);
        return ResponseEntity.ok(ApiResponse.success(null, "会话已删除"));
    }
}
