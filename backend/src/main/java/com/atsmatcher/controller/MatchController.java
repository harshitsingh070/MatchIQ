// backend/src/main/java/com/atsmatcher/controller/MatchController.java
package com.atsmatcher.controller;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.atsmatcher.entity.JobPosting;
import com.atsmatcher.entity.MatchResult;
import com.atsmatcher.entity.Resume;
import com.atsmatcher.entity.StudentProfile;
import com.atsmatcher.entity.User;
import com.atsmatcher.repository.JobPostingRepository;
import com.atsmatcher.repository.MatchResultRepository;
import com.atsmatcher.repository.ResumeRepository;
import com.atsmatcher.repository.StudentProfileRepository;
import com.atsmatcher.repository.UserRepository;
import com.atsmatcher.service.EligibilityService;
import com.atsmatcher.service.MatchingService;

@RestController
@RequestMapping("/api/matches")
public class MatchController {

    private final ResumeRepository resumeRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final JobPostingRepository jobPostingRepository;
    private final UserRepository userRepository;
    private final MatchResultRepository matchResultRepository;
    private final EligibilityService eligibilityService;
    private final MatchingService matchingService;

    public MatchController(ResumeRepository resumeRepository,
                            StudentProfileRepository studentProfileRepository,
                            JobPostingRepository jobPostingRepository,
                            UserRepository userRepository,
                            MatchResultRepository matchResultRepository,
                            EligibilityService eligibilityService,
                            MatchingService matchingService) {
        this.resumeRepository = resumeRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.jobPostingRepository = jobPostingRepository;
        this.userRepository = userRepository;
        this.matchResultRepository = matchResultRepository;
        this.eligibilityService = eligibilityService;
        this.matchingService = matchingService;
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('STUDENT')")
    public List<Map<String, Object>> myMatches(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        StudentProfile profile = studentProfileRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("No resume uploaded yet"));

        // The genuinely most recent resume - ordered by uploadedAt desc + limit 1,
        // not "whichever row findAll() happened to return first".
        Resume latestResume = resumeRepository.findTopByStudentOrderByUploadedAtDesc(profile)
                .orElseThrow(() -> new RuntimeException("No resume found"));

        List<JobPosting> publishedPostings = jobPostingRepository.findByStatus(JobPosting.Status.PUBLISHED);

        // Hard eligibility filter - skip postings the student can't meet before spending
        // Python/LLM calls on /match and /explain for them.
        publishedPostings = publishedPostings.stream()
                .filter(p -> eligibilityService.isEligible(p, profile))
                .toList();

        List<Map<String, Object>> results = new ArrayList<>();

        for (JobPosting posting : publishedPostings) {
            MatchingService.MatchOutcome outcome = matchingService.getOrComputeMatch(
                    latestResume.getId(), posting.getId());

            if (outcome == null) {
                continue; // no embeddings yet for this posting - skip rather than error
            }

            results.add(Map.of(
                    "postingId", posting.getId(),
                    "title", posting.getTitle(),
                    "score", outcome.score,
                    "explanation", outcome.explanation
            ));
        }

        // Sort highest score first
        results.sort((a, b) -> Double.compare(
                ((Number) b.get("score")).doubleValue(),
                ((Number) a.get("score")).doubleValue()
        ));

        return results;
    }

    // Score trend between the student's most recent resume and the one before it.
    // Old Resume rows are never deleted, so the previous resume's cached match
    // results are still addressable by resume_id - zero extra scoring needed.
    @GetMapping("/trend")
    @PreAuthorize("hasRole('STUDENT')")
    public Map<String, Object> getTrend(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        StudentProfile profile = studentProfileRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("No resume uploaded yet"));

        List<Resume> resumes = resumeRepository.findByStudentOrderByUploadedAtDesc(profile);
        if (resumes.size() < 2) {
            return Map.of("hasTrend", false);
        }

        Resume latest = resumes.get(0);
        Resume previous = resumes.get(1);

        Double currentAvg = averageScore(latest.getId());
        Double previousAvg = averageScore(previous.getId());

        // No baseline if either resume was never scored (no match_results rows).
        if (currentAvg == null || previousAvg == null) {
            return Map.of("hasTrend", false);
        }

        double delta = Math.round((currentAvg - previousAvg) * 10.0) / 10.0;

        Map<String, Object> result = new HashMap<>();
        result.put("hasTrend", true);
        result.put("currentScore", currentAvg);
        result.put("previousScore", previousAvg);
        result.put("delta", delta);
        return result;
    }

    private Double averageScore(UUID resumeId) {
        List<MatchResult> results = matchResultRepository.findByResumeId(resumeId);
        if (results.isEmpty()) {
            return null;
        }
        double sum = 0;
        for (MatchResult r : results) {
            sum += r.getScore().doubleValue();
        }
        return sum / results.size();
    }
}
