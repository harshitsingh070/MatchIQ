// backend/src/main/java/com/atsmatcher/controller/CandidateController.java
package com.atsmatcher.controller;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.atsmatcher.entity.JobPosting;
import com.atsmatcher.entity.Resume;
import com.atsmatcher.repository.JobPostingRepository;
import com.atsmatcher.repository.ResumeRepository;
import com.atsmatcher.service.MatchingService;

// Split out into its own controller, mirroring how MatchController owns the
// ranked-matching concern — this endpoint is "rank all students against one
// posting", the reverse of MatchController's "rank postings for one student".
@RestController
@RequestMapping("/api/postings")
public class CandidateController {

    private final ResumeRepository resumeRepository;
    private final JobPostingRepository jobPostingRepository;
    private final MatchingService matchingService;

    public CandidateController(ResumeRepository resumeRepository,
                               JobPostingRepository jobPostingRepository,
                               MatchingService matchingService) {
        this.resumeRepository = resumeRepository;
        this.jobPostingRepository = jobPostingRepository;
        this.matchingService = matchingService;
    }

    @GetMapping("/{id}/candidates")
    @PreAuthorize("hasAnyRole('RECRUITER', 'PLACEMENT_CELL')")
    public List<Map<String, Object>> getCandidates(@PathVariable UUID id) {
        JobPosting posting = jobPostingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Posting not found"));

        // TODO: extend with a proper query at scale - same known shortcut as MatchController
        List<Resume> allResumes = resumeRepository.findAll();

        List<Map<String, Object>> results = new ArrayList<>();

        for (Resume resume : allResumes) {
            // Deliberate deviation from MatchController's strict error propagation:
            // a recruiter viewing candidates shouldn't get a 500 because one student's
            // embedding hasn't been generated — skip that resume and rank the rest.
            MatchingService.MatchOutcome outcome = matchingService.getOrComputeMatch(
                    resume.getId(), posting.getId());

            if (outcome == null) {
                continue;
            }

            final MatchingService.MatchOutcome matchOutcome = outcome;

            results.add(new HashMap<>() {{
                put("resumeId", resume.getId());
                put("studentEmail", resume.getStudent().getUser().getEmail());
                put("branch", resume.getStudent().getBranch());
                put("cgpa", resume.getStudent().getCgpa());
                put("score", matchOutcome.score);
                put("explanation", matchOutcome.explanation);
            }});
        }

        results.sort((a, b) -> Double.compare(
                ((Number) b.get("score")).doubleValue(),
                ((Number) a.get("score")).doubleValue()
        ));

        return results;
    }
}
