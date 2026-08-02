// backend/src/main/java/com/atsmatcher/service/MatchingService.java
package com.atsmatcher.service;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.atsmatcher.entity.MatchResult;
import com.atsmatcher.repository.MatchResultRepository;

@Service
public class MatchingService {

    private final MatchResultRepository matchResultRepository;
    private final RestTemplate restTemplate;

    @Value("${app.rag-service.url}")
    private String ragServiceUrl;

    public MatchingService(MatchResultRepository matchResultRepository, RestTemplate restTemplate) {
        this.matchResultRepository = matchResultRepository;
        this.restTemplate = restTemplate;
    }

    public static class MatchOutcome {
        public final double score;
        public final String explanation;
        public final boolean fromCache;

        public MatchOutcome(double score, String explanation, boolean fromCache) {
            this.score = score;
            this.explanation = explanation;
            this.fromCache = fromCache;
        }
    }

    /**
     * Returns a cached match result if one exists for this resume/posting pair.
     * Otherwise calls the Python service for both score and explanation, stores
     * the result, and returns it. Returns null if the Python service has no
     * embeddings yet for this pair (caller should skip/handle gracefully).
     *
     * KNOWN LIMITATION: cache never expires on posting edits. If a posting's
     * text changes after being cached against a resume, that cached entry
     * will not reflect the edit. Acceptable for now - see feature doc.
     */
    public MatchOutcome getOrComputeMatch(UUID resumeId, UUID postingId) {
        var cached = matchResultRepository.findByResumeIdAndPostingId(resumeId, postingId);
        if (cached.isPresent()) {
            MatchResult r = cached.get();
            return new MatchOutcome(r.getScore().doubleValue(), r.getExplanation(), true);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<String, Object> requestBody = Map.of(
                "resume_id", resumeId.toString(),
                "posting_id", postingId.toString()
        );
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        Map<String, Object> matchResult;
        try {
            matchResult = restTemplate.postForObject(ragServiceUrl + "/match", entity, Map.class);
        } catch (Exception e) {
            System.err.println("No match computed for resume=" + resumeId + " posting=" + postingId
                    + ": " + e.getMessage());
            return null; // no embeddings yet for this pair - caller decides how to handle
        }

        if (matchResult == null || matchResult.containsKey("error")) {
            return null;
        }

        double score = ((Number) matchResult.getOrDefault("score", 0)).doubleValue();

        String explanation;
        try {
            Map<String, Object> explainResult = restTemplate.postForObject(
                    ragServiceUrl + "/explain", entity, Map.class);
            explanation = (String) explainResult.getOrDefault("explanation", "No explanation available");
        } catch (Exception e) {
            explanation = "Explanation temporarily unavailable";
        }

        MatchResult toSave = new MatchResult();
        toSave.setResumeId(resumeId);
        toSave.setPostingId(postingId);
        toSave.setScore(BigDecimal.valueOf(score));
        toSave.setExplanation(explanation);
        matchResultRepository.save(toSave);

        return new MatchOutcome(score, explanation, false);
    }
}
