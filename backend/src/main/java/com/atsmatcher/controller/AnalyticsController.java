// backend/src/main/java/com/atsmatcher/controller/AnalyticsController.java
package com.atsmatcher.controller;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.atsmatcher.entity.JobPosting;
import com.atsmatcher.entity.MatchResult;
import com.atsmatcher.entity.Resume;
import com.atsmatcher.repository.JobPostingRepository;
import com.atsmatcher.repository.MatchResultRepository;
import com.atsmatcher.repository.ResumeRepository;
import com.atsmatcher.repository.StudentProfileRepository;
import com.atsmatcher.service.EligibilityService;

@RestController
@RequestMapping("/api/placement-cell")
public class AnalyticsController {

    private final JobPostingRepository jobPostingRepository;
    private final ResumeRepository resumeRepository;
    private final MatchResultRepository matchResultRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final EligibilityService eligibilityService;

    public AnalyticsController(JobPostingRepository jobPostingRepository,
                               ResumeRepository resumeRepository,
                               MatchResultRepository matchResultRepository,
                               StudentProfileRepository studentProfileRepository,
                               EligibilityService eligibilityService) {
        this.jobPostingRepository = jobPostingRepository;
        this.resumeRepository = resumeRepository;
        this.matchResultRepository = matchResultRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.eligibilityService = eligibilityService;
    }

    // Placement cell analytics: summary stats plus per-posting performance.
    // candidateCount reflects how many resumes have a match_results row for the
    // posting (scoring is lazy - runs on-demand when a student or recruiter
    // views results), not how many students are theoretically eligible.
    @GetMapping("/analytics")
    @PreAuthorize("hasRole('PLACEMENT_CELL')")
    public Map<String, Object> getAnalytics() {
        List<JobPosting> allPostings = jobPostingRepository.findAll();
        List<Resume> allResumes = resumeRepository.findAll();
        List<MatchResult> allMatchResults = matchResultRepository.findAll();

        long draftCount = allPostings.stream()
                .filter(p -> p.getStatus() == JobPosting.Status.DRAFT)
                .count();
        long publishedCount = allPostings.stream()
                .filter(p -> p.getStatus() == JobPosting.Status.PUBLISHED)
                .count();

        long recruiterCount = allPostings.stream()
                .map(p -> p.getRecruiter().getId())
                .distinct()
                .count();

        double avgScoreOverall = allMatchResults.isEmpty() ? 0 :
                allMatchResults.stream()
                        .mapToDouble(r -> r.getScore().doubleValue())
                        .average().orElse(0);

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalPostings", allPostings.size());
        summary.put("draftCount", draftCount);
        summary.put("publishedCount", publishedCount);
        summary.put("totalStudents", studentProfileRepository.count());
        summary.put("totalResumes", allResumes.size());
        summary.put("totalRecruiters", recruiterCount);
        summary.put("avgScoreOverall", Math.round(avgScoreOverall * 10.0) / 10.0);

        List<Map<String, Object>> postingStats = new ArrayList<>();
        for (JobPosting posting : allPostings) {
            List<MatchResult> resultsForPosting = allMatchResults.stream()
                    .filter(r -> r.getPostingId().equals(posting.getId()))
                    .toList();

            double avgScore = resultsForPosting.isEmpty() ? 0 :
                    resultsForPosting.stream()
                            .mapToDouble(r -> r.getScore().doubleValue())
                            .average().orElse(0);

            double topScore = resultsForPosting.stream()
                    .mapToDouble(r -> r.getScore().doubleValue())
                    .max().orElse(0);

            Map<String, Object> eligibility = eligibilityService.parseEligibility(posting.getEligibilityCriteria());

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("postingId", posting.getId());
            row.put("title", posting.getTitle());
            row.put("status", posting.getStatus().name());
            row.put("recruiterEmail", posting.getRecruiter().getEmail());
            row.put("createdAt", posting.getCreatedAt().toString());
            row.put("eligibleBranches", eligibility.getOrDefault("branches", List.of()));
            row.put("minCgpa", eligibility.get("minCgpa"));
            row.put("candidateCount", resultsForPosting.size());
            row.put("avgScore", Math.round(avgScore * 10.0) / 10.0);
            row.put("topScore", Math.round(topScore * 10.0) / 10.0);

            postingStats.add(row);
        }

        // Sort by candidate count descending - most-engaged postings first
        postingStats.sort((a, b) -> Integer.compare(
                (Integer) b.get("candidateCount"),
                (Integer) a.get("candidateCount")));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("summary", summary);
        response.put("postings", postingStats);
        return response;
    }
}
