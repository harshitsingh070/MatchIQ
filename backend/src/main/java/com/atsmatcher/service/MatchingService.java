// backend/src/main/java/com/atsmatcher/service/MatchingService.java
package com.atsmatcher.service;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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
        public final List<String> presentSkills;
        public final List<String> missingSkills;
        public final boolean fromCache;

        public MatchOutcome(double score, String explanation, boolean fromCache,
                            List<String> presentSkills, List<String> missingSkills) {
            this.score = score;
            this.explanation = explanation;
            this.presentSkills = presentSkills;
            this.missingSkills = missingSkills;
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
            return new MatchOutcome(r.getScore().doubleValue(), r.getExplanation(), true,
                    splitSkills(r.getPresentSkills()), splitSkills(r.getMissingSkills()));
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
        List<String> presentSkills = List.of();
        List<String> missingSkills = List.of();
        try {
            Map<String, Object> explainResult = restTemplate.postForObject(
                    ragServiceUrl + "/explain", entity, Map.class);
            if (explainResult == null) {
                explainResult = Map.of();
            }
            explanation = (String) explainResult.getOrDefault("explanation", "No explanation available");
            presentSkills = skillsFrom(explainResult.get("present_skills"));
            missingSkills = skillsFrom(explainResult.get("missing_skills"));
        } catch (Exception e) {
            explanation = "Explanation temporarily unavailable";
        }

        MatchResult toSave = new MatchResult();
        toSave.setResumeId(resumeId);
        toSave.setPostingId(postingId);
        toSave.setScore(BigDecimal.valueOf(score));
        toSave.setExplanation(explanation);
        toSave.setPresentSkills(joinSkills(presentSkills));
        toSave.setMissingSkills(joinSkills(missingSkills));
        matchResultRepository.save(toSave);

        return new MatchOutcome(score, explanation, false, presentSkills, missingSkills);
    }

    @SuppressWarnings("unchecked")
    private List<String> skillsFrom(Object value) {
        if (value instanceof List<?> list) {
            return list.stream().filter(Objects::nonNull).map(String::valueOf).toList();
        }
        return List.of();
    }

    private String joinSkills(List<String> skills) {
        return String.join(", ", skills);
    }

    private List<String> splitSkills(String joined) {
        if (joined == null || joined.isBlank()) {
            return List.of();
        }
        return Arrays.stream(joined.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }
}
