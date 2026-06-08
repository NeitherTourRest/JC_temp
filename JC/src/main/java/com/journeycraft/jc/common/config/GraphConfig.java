package com.journeycraft.jc.common.config;

import com.journeycraft.jc.navigation.graph.Graph;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Provides the navigation graph as a singleton bean.
 * The graph is initially empty and will be populated by the data loader.
 */
@Configuration
public class GraphConfig {

    @Bean
    public Graph navigationGraph() {
        return new Graph("changping_road_network");
    }
}
