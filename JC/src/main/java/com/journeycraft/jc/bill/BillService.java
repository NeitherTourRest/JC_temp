package com.journeycraft.jc.bill;

import com.journeycraft.jc.itinerary.entity.Itinerary;
import com.journeycraft.jc.itinerary.repository.ItineraryRepository;
import com.journeycraft.jc.spot.repository.SpotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.*;

@Service @RequiredArgsConstructor
public class BillService {
    private final ItineraryRepository itineraryRepository;
    private final SpotRepository spotRepository;

    public Map<String, Object> generateBill(Long itineraryId) {
        Itinerary it = itineraryRepository.findById(itineraryId).orElse(null);
        if (it == null || it.getSpotIds() == null) return emptyBill();
        String[] ids = it.getSpotIds().split(",");
        double[] tickets = {0};
        double transport = it.getTotalDistance() != null ? it.getTotalDistance() * 0.005 : 0;
        for (String sid : ids) {
            try {
                spotRepository.findById(Long.parseLong(sid.trim()))
                        .ifPresent(s -> { if (s.getTicketPrice() != null) tickets[0] += s.getTicketPrice().doubleValue(); });
            } catch (NumberFormatException ignored) {}
        }
        double food = tickets[0] * 0.3, lodging = 300, shopping = 100;
        Map<String, Object> bill = new LinkedHashMap<>();
        bill.put("transport", Math.round(transport * 100.0) / 100.0);
        bill.put("tickets", Math.round(tickets[0] * 100.0) / 100.0);
        bill.put("food", Math.round(food * 100.0) / 100.0);
        bill.put("lodging", lodging);
        bill.put("shopping", shopping);
        bill.put("total", Math.round((transport + tickets[0] + food + lodging + shopping) * 100.0) / 100.0);
        return bill;
    }

    private Map<String, Object> emptyBill() {
        Map<String, Object> bill = new LinkedHashMap<>();
        bill.put("transport", 0); bill.put("tickets", 0); bill.put("food", 0);
        bill.put("lodging", 0); bill.put("shopping", 0); bill.put("total", 0);
        return bill;
    }
}
