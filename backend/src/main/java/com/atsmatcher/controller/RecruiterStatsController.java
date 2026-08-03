// backend/src/main/java/com/atsmatcher/controller/RecruiterStatsController.java
package com.atsmatcher.controller;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.atsmatcher.entity.JobPosting;
import com.atsmatcher.entity.MatchResult;
import com.atsmatcher.entity.Resume;
import com.atsmatcher.repository.JobPostingRepository;
import com.atsmatcher.repository.MatchResultRepository;
import com.atsmatcher.repository.ResumeRepository;
import com.atsmatcher.service.EligibilityService;

// Recruiter-scoped analytics: summary stats plus per-posting performance for
// exactly the authenticated recruiter's own postings. Mirrors the placement
// cell's analytics endpoint, but filtered to one recruiter.
@RestController
@RequestMapping("/api/recruiter")
public class RecruiterStatsController {

    private final JobPostingRepository jobPostingRepository;
    private final MatchResultRepository matchResultRepository;
    private final ResumeRepository resumeRepository;
    private final EligibilityService eligibilityService;

    public RecruiterStatsController(JobPostingRepository jobPostingRepository,
                                    MatchResultRepository matchResultRepository,
                                    ResumeRepository resumeRepository,
                                    EligibilityService eligibilityService) {
        this.jobPostingRepository = jobPostingRepository;
        this.matchResultRepository = matchResultRepository;
        this.resumeRepository = resumeRepository;
        this.eligibilityService = eligibilityService;
    }

    @GetMapping("/my-postings")
    @PreAuthorize("hasRole('RECRUITER')")
    public Map<String, Object> getMyPostingsStats(Authentication authentication) {
        List<JobPosting> myPostings = jobPostingRepository.findAll().stream()
                .filter(p -> p.getRecruiter().getEmail().equals(authentication.getName()))
                .toList();

        List<MatchResult> allMatchResults = matchResultRepository.findAll();

        long draftCount = myPostings.stream().filter(p -> p.getStatus() == JobPosting.Status.DRAFT).count();
        long publishedCount = myPostings.stream().filter(p -> p.getStatus() == JobPosting.Status.PUBLISHED).count();

        List<Map<String, Object>> postingStats = new ArrayList<>();
        int totalCandidatesScored = 0;
        List<Double> allScores = new ArrayList<>();

        for (JobPosting posting : myPostings) {
            List<MatchResult> resultsForPosting = allMatchResults.stream()
                    .filter(r -> r.getPostingId().equals(posting.getId()))
                    .toList();

            double avgScore = resultsForPosting.isEmpty() ? 0 :
                    resultsForPosting.stream().mapToDouble(r -> r.getScore().doubleValue()).average().orElse(0);
            double topScore = resultsForPosting.stream()
                    .mapToDouble(r -> r.getScore().doubleValue()).max().orElse(0);

            MatchResult topResult = resultsForPosting.stream()
                    .max(Comparator.comparing(r -> r.getScore().doubleValue()))
                    .orElse(null);

            String topCandidateEmail = null;
            if (topResult != null) {
                Resume topResume = resumeRepository.findById(topResult.getResumeId()).orElse(null);
                if (topResume != null) {
                    topCandidateEmail = topResume.getStudent().getUser().getEmail();
                }
            }

            totalCandidatesScored += resultsForPosting.size();
            resultsForPosting.forEach(r -> allScores.add(r.getScore().doubleValue()));

            Map<String, Object> eligibility = eligibilityService.parseEligibility(posting.getEligibilityCriteria());

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("postingId", posting.getId());
            row.put("title", posting.getTitle());
            row.put("status", posting.getStatus().name());
            row.put("createdAt", posting.getCreatedAt().toString());
            row.put("eligibleBranches", eligibility.getOrDefault("branches", List.of()));
            row.put("minCgpa", eligibility.get("minCgpa"));
            row.put("candidateCount", resultsForPosting.size());
            row.put("avgScore", Math.round(avgScore * 10.0) / 10.0);
            row.put("topScore", Math.round(topScore * 10.0) / 10.0);
            row.put("topCandidateEmail", topCandidateEmail);
            postingStats.add(row);
        }

        double avgAcrossAll = allScores.isEmpty() ? 0 :
                allScores.stream().mapToDouble(Double::doubleValue).average().orElse(0);

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalPostings", myPostings.size());
        summary.put("publishedCount", publishedCount);
        summary.put("draftCount", draftCount);
        summary.put("totalCandidatesScored", totalCandidatesScored);
        summary.put("avgScoreAcrossPostings", Math.round(avgAcrossAll * 10.0) / 10.0);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("summary", summary);
        response.put("postings", postingStats);
        return response;
    }
}
