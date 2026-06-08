package com.journeycraft.jc;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class JcApplication {

    private static final Logger log = LoggerFactory.getLogger(JcApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(JcApplication.class, args);
    }

    @Bean
    CommandLineRunner startupMessage() {
        return args -> log.info("""
                
                ╔══════════════════════════════════════════╗
                ║     JourneyCraft Tourism System v2.0     ║
                ║     Application started successfully!     ║
                ╚══════════════════════════════════════════╝
                """);
    }
}
