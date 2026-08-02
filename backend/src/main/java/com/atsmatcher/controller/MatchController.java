// backend/src/main/java/com/atsmatcher/controller/MatchController.java
package com.atsmatcher.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.atsmatcher.entity.JobPosting;
import com.atsmatcher.entity.Resume;
import com.atsmatcher.entity.StudentProfile;
import com.atsmatcher.entity.User;
import com.atsmatcher.repository.JobPostingRepository;
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
    private final EligibilityService eligibilityService;
    private final MatchingService matchingService;

    public MatchController(ResumeRepository resumeRepository,
                            StudentProfileRepository studentProfileRepository,
                            JobPostingRepository jobPostingRepository,
                            UserRepository userRepository,
                            EligibilityService eligibilityService,
                            MatchingService matchingService) {
        this.resumeRepository = resumeRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.jobPostingRepository = jobPostingRepository;
        this.userRepository = userRepository;
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

        // For simplicity: get their most recent resume (extend later with a findTopByStudentOrderByUploadedAtDesc query)
        List<Resume> resumes = resumeRepository.findAll();
        Resume latestResume = resumes.stream()
                .filter(r -> r.getStudent().getId().equals(profile.getId()))
                .findFirst()
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
}
