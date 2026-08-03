// backend/src/main/java/com/atsmatcher/controller/JobPostingController.java
package com.atsmatcher.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import com.atsmatcher.dto.JobPostingRequest;
import com.atsmatcher.entity.JobPosting;
import com.atsmatcher.entity.StudentProfile;
import com.atsmatcher.entity.User;
import com.atsmatcher.repository.JobPostingRepository;
import com.atsmatcher.repository.StudentProfileRepository;
import com.atsmatcher.repository.UserRepository;
import com.atsmatcher.service.EligibilityService;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/postings")
public class JobPostingController {

    private final JobPostingRepository jobPostingRepository;
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final EligibilityService eligibilityService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.rag-service.url}")
    private String ragServiceUrl;

    public JobPostingController(JobPostingRepository jobPostingRepository,
                                UserRepository userRepository,
                                StudentProfileRepository studentProfileRepository,
                                EligibilityService eligibilityService,
                                RestTemplate restTemplate) {
        this.jobPostingRepository = jobPostingRepository;
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.eligibilityService = eligibilityService;
        this.restTemplate = restTemplate;
    }

    // Recruiters create postings (start as DRAFT)
    @PostMapping
    @PreAuthorize("hasRole('RECRUITER')")
    public ResponseEntity<?> create(@RequestBody JobPostingRequest req, Authentication authentication) {
        User recruiter = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        JobPosting posting = new JobPosting();
        posting.setRecruiter(recruiter);
        posting.setTitle(req.getTitle());
        posting.setDescription(req.getDescription());
        posting.setRequiredSkills(req.getRequiredSkills());
        posting.setStatus(JobPosting.Status.DRAFT);

        Map<String, Object> eligibility = new HashMap<>();
        if (req.getEligibleBranches() != null && !req.getEligibleBranches().isEmpty()) {
            eligibility.put("branches", req.getEligibleBranches());
        }
        if (req.getMinCgpa() != null) {
            eligibility.put("minCgpa", req.getMinCgpa());
        }

        if (!eligibility.isEmpty()) {
            try {
                posting.setEligibilityCriteria(objectMapper.writeValueAsString(eligibility));
            } catch (Exception e) {
                posting.setEligibilityCriteria(null);
            }
        }

        jobPostingRepository.save(posting);
        return ResponseEntity.ok(posting);
    }

    // Recruiters edit only their own DRAFT postings. Published postings are
    // already embedded and potentially scored against students, so changing
    // them here would silently invalidate that cache — rejected server-side.
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('RECRUITER')")
    public ResponseEntity<?> updateDraft(@PathVariable UUID id, @RequestBody JobPostingRequest req,
                                        Authentication authentication) {
        JobPosting posting = jobPostingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Posting not found"));

        if (!posting.getRecruiter().getEmail().equals(authentication.getName())) {
            return ResponseEntity.status(403).body("Not your posting");
        }
        if (posting.getStatus() != JobPosting.Status.DRAFT) {
            return ResponseEntity.status(400).body("Only draft postings can be edited");
        }

        posting.setTitle(req.getTitle());
        posting.setDescription(req.getDescription());
        posting.setRequiredSkills(req.getRequiredSkills());

        Map<String, Object> eligibility = new HashMap<>();
        if (req.getEligibleBranches() != null && !req.getEligibleBranches().isEmpty()) {
            eligibility.put("branches", req.getEligibleBranches());
        }
        if (req.getMinCgpa() != null) {
            eligibility.put("minCgpa", req.getMinCgpa());
        }

        try {
            posting.setEligibilityCriteria(eligibility.isEmpty() ? null
                    : objectMapper.writeValueAsString(eligibility));
        } catch (Exception e) {
            posting.setEligibilityCriteria(null);
        }

        jobPostingRepository.save(posting);
        return ResponseEntity.ok(posting);
    }

    // Placement cell approves and publishes a posting
    @PutMapping("/{id}/publish")
    @PreAuthorize("hasRole('PLACEMENT_CELL')")
    public ResponseEntity<?> publish(@PathVariable UUID id) {
        JobPosting posting = jobPostingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Posting not found"));

        posting.setStatus(JobPosting.Status.PUBLISHED);
        jobPostingRepository.save(posting);

        // Embed the posting so it can be matched against student resumes. A
        // published-but-unembedded posting is invisible to student matching, so
        // this failure must be loud in the logs - not silently swallowed.
        HttpHeaders jsonHeaders = new HttpHeaders();
        jsonHeaders.setContentType(MediaType.APPLICATION_JSON);

        String skills = posting.getRequiredSkills() == null ? "" : posting.getRequiredSkills();
        Map<String, Object> embedRequest = Map.of(
                "posting_id", posting.getId().toString(),
                "text", String.join("\n",
                        posting.getTitle(),
                        posting.getDescription(),
                        "Required skills: " + skills)
        );
        HttpEntity<Map<String, Object>> embedEntity = new HttpEntity<>(embedRequest, jsonHeaders);

        try {
            restTemplate.postForObject(ragServiceUrl + "/embed-posting", embedEntity, Map.class);
        } catch (Exception e) {
            System.err.println("WARNING: posting " + posting.getId() + " published but embedding failed: "
                    + e.getMessage());
            // Posting is still published (status change already saved), but will be
            // invisible to student matching until embedding succeeds. This should be
            // visible to the placement cell, not just a server log - flagged for a
            // future "needs attention" UI.
        }

        return ResponseEntity.ok(posting);
    }

    // Students see only published postings they are eligible for; recruiters and the
    // placement cell see everything.
    @GetMapping
    @PreAuthorize("hasAnyRole('STUDENT', 'RECRUITER', 'PLACEMENT_CELL')")
    public List<JobPosting> list(Authentication authentication) {
        boolean isStudent = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_STUDENT"));

        if (isStudent) {
            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            StudentProfile profile = studentProfileRepository.findByUser(user)
                    .orElseGet(() -> {
                        StudentProfile newProfile = new StudentProfile();
                        newProfile.setUser(user);
                        return studentProfileRepository.save(newProfile);
                    });

            return jobPostingRepository.findByStatus(JobPosting.Status.PUBLISHED).stream()
                    .filter(p -> eligibilityService.isEligible(p, profile))
                    .toList();
        }
        return jobPostingRepository.findAll();
    }
}