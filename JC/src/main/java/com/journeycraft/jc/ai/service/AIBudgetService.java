package com.journeycraft.jc.ai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * AI预算估计服务 - 根据行程生成预算报告
 * 
 * Harness工程:
 * - 结构化prompt（天数、人数、景点、交通方式）
 * - 分类预算（交通/门票/餐饮/住宿/其他）
 * - 响应JSON解析
 */
@Service
public class AIBudgetService {

    private static final Logger log = LoggerFactory.getLogger(AIBudgetService.class);
    private final DeepSeekClient deepSeek;
    private final ObjectMapper mapper = new ObjectMapper();

    public AIBudgetService(DeepSeekClient deepSeek) {
        this.deepSeek = deepSeek;
    }

    private static final String SYSTEM_PROMPT = """
你是一个旅行预算分析师。根据用户提供的行程信息，生成详细的预算报告。

输出格式要求：必须使用以下JSON格式，确保是合法JSON：

{
  "totalBudget": "总预算",
  "currency": "CNY",
  "categories": [
    {"name": "交通", "amount": 金额, "details": "明细说明"},
    {"name": "门票", "amount": 金额, "details": "明细说明"},
    {"name": "餐饮", "amount": 金额, "details": "明细说明"},
    {"name": "住宿", "amount": 金额, "details": "明细说明"},
    {"name": "其他", "amount": 金额, "details": "明细说明"}
  ],
  "suggestions": ["省钱建议1", "省钱建议2"]
}

要求：
1. 基于北京昌平区实际物价水平估算
2. 分类要清晰合理
3. 给出具体的省钱建议
""";

    public record BudgetRequest(
        int days,
        int peopleCount,
        String spots,         // 景点列表
        String transport,     // 交通方式
        String diningPref,    // 餐饮偏好
        String accommodation // 住宿要求
    ) {}

    public record BudgetCategory(String name, double amount, String details) {}
    public record BudgetResult(
        String totalBudget,
        String currency,
        List<BudgetCategory> categories,
        List<String> suggestions,
        String rawResponse
    ) {}

    /**
     * 生成预算报告
     */
    public BudgetResult estimateBudget(BudgetRequest request) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("请为以下行程做预算估算：");
        prompt.append("\n天数：").append(request.days()).append("天");
        prompt.append("\n人数：").append(request.peopleCount()).append("人");
        prompt.append("\n计划游览景点：").append(request.spots() != null ? request.spots() : "未指定");
        prompt.append("\n交通方式：").append(request.transport() != null ? request.transport() : "未指定");
        prompt.append("\n餐饮偏好：").append(request.diningPref() != null ? request.diningPref() : "一般");
        prompt.append("\n住宿要求：").append(request.accommodation() != null ? request.accommodation() : "未指定");

        String reply = deepSeek.chat(List.of(Map.of("role", "user", "content", prompt.toString())), SYSTEM_PROMPT);

        try {
            String json = reply.trim().replaceAll("```json\\s*", "").replaceAll("```\\s*", "");
            var root = mapper.readTree(json);

            List<BudgetCategory> categories = new ArrayList<>();
            if (root.has("categories")) {
                for (var cat : root.get("categories")) {
                    categories.add(new BudgetCategory(
                        getStr(cat, "name"),
                        cat.has("amount") ? cat.get("amount").asDouble(0) : 0,
                        getStr(cat, "details")
                    ));
                }
            }

            List<String> suggestions = new ArrayList<>();
            if (root.has("suggestions")) {
                root.get("suggestions").forEach(s -> suggestions.add(s.asText()));
            }

            return new BudgetResult(
                getStr(root, "totalBudget"),
                getStr(root, "currency"),
                categories, suggestions, null
            );
        } catch (Exception e) {
            log.warn("Failed to parse AI budget response: {}", e.getMessage());
            return new BudgetResult("", "CNY", List.of(), List.of(), reply);
        }
    }

    private String getStr(com.fasterxml.jackson.databind.JsonNode node, String field) {
        return node.has(field) && !node.get(field).isNull() ? node.get(field).asText() : "";
    }
}
