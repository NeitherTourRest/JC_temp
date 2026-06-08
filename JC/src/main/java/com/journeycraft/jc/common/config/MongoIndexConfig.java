package com.journeycraft.jc.common.config;

import com.journeycraft.jc.diary.document.Diary;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.TextIndexDefinition;

@Configuration
public class MongoIndexConfig {
    private final MongoTemplate mongoTemplate;

    public MongoIndexConfig(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @PostConstruct
    public void createTextIndex() {
        try {
            TextIndexDefinition textIndex = new TextIndexDefinition.TextIndexDefinitionBuilder()
                    .onField("title")
                    .onField("content")
                    .onField("destination")
                    .build();
            mongoTemplate.indexOps(Diary.class).ensureIndex(textIndex);
        } catch (Exception e) {
            // Index may already exist
        }
    }
}
