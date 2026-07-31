// backend/src/main/java/com/atsmatcher/controller/JobPostingController.java
package com.atsmatcher.controller;

import java.util.List;
import java.util.UUID;

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

import com.atsmatcher.dto.JobPostingRequest;
import com.atsmatcher.entity.JobPosting;
import com.atsmatcher.entity.User;
import com.atsmatcher.repository.JobPostingRepository;
import com.atsmatcher.repository.UserRepository;

@RestController
@RequestMapping("/api/postings")
public class JobPostingController {

    private final JobPostingRepository jobPostingRepository;
    private final UserRepository userRepository;

    public JobPostingController(JobPostingRepository jobPostingRepository, UserRepository userRepository) {
        this.jobPostingRepository = jobPostingRepository;
        this.userRepository = userRepository;
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
        return ResponseEntity.ok(posting);
    }

    // Students see only published postings
    @GetMapping
    @PreAuthorize("hasAnyRole('STUDENT', 'RECRUITER', 'PLACEMENT_CELL')")
    public List<JobPosting> list(Authentication authentication) {
        boolean isStudent = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_STUDENT"));

        if (isStudent) {
            return jobPostingRepository.findByStatus(JobPosting.Status.PUBLISHED);
        }
        return jobPostingRepository.findAll();
    }
}