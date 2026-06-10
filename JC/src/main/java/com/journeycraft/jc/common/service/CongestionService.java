package com.journeycraft.jc.common.service;

import com.journeycraft.jc.common.entity.CongestionReport;
import com.journeycraft.jc.common.repository.CongestionReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CongestionService {

    private static final Map<String, Double> LEVEL_VALUES = Map.of(
        "OVERFLOWING", 5.0, "CROWDED", 4.0, "MODERATE", 3.0, "SPARSE", 2.0, "EMPTY", 1.0
    );

    private final CongestionReportRepository repository;

    /** Submit a congestion report (atomic upsert). Returns the NEW computed level. */
    @Transactional
    public String report(String targetType, Long targetId, Long userId, String level) {
        repository.upsert(targetType, targetId, userId, level);
        return computeLevel(targetType, targetId);
    }

    /** Compute simple average of all users' latest reports for this target. */
    public String computeLevel(String targetType, Long targetId) {
        List<CongestionReport> reports = repository.findByTargetTypeAndTargetId(targetType, targetId);
        if (reports.isEmpty()) return "EMPTY";

        double avg = reports.stream()
                .mapToDouble(r -> LEVEL_VALUES.getOrDefault(r.getLevel(), 1.0))
                .average()
                .orElse(1.0);

        if (avg >= 4.5) return "OVERFLOWING";
        if (avg >= 3.5) return "CROWDED";
        if (avg >= 2.5) return "MODERATE";
        if (avg >= 1.5) return "SPARSE";
        return "EMPTY";
    }
}
