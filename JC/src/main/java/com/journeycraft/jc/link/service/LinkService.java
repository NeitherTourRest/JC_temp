package com.journeycraft.jc.link.service;

import com.journeycraft.jc.link.entity.TravelServiceLink;
import com.journeycraft.jc.link.repository.LinkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service @RequiredArgsConstructor
public class LinkService {
    private final LinkRepository linkRepository;

    @Transactional(readOnly = true)
    public List<TravelServiceLink> getLinksBySpot(Long spotId) {
        return linkRepository.findBySpotId(spotId);
    }
}
