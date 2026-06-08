package com.journeycraft.jc.bill;

import com.journeycraft.jc.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController @RequestMapping("/api/v1/bills") @RequiredArgsConstructor
public class BillController {
    private final BillService billService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getBillSummary(@RequestParam Long itineraryId) {
        return ResponseEntity.ok(ApiResponse.success(billService.generateBill(itineraryId)));
    }
}
