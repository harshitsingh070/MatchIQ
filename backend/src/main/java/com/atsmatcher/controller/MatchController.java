// backend/src/main/java/com/atsmatcher/controller/MatchController.java
package com.atsmatcher.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import com.atsmatcher.entity.JobPosting;
import com.atsmatcher.entity.Resume;
import com.atsmatcher.entity.StudentProfile;
import com.atsmatcher.entity.User;
import com.atsmatcher.repository.JobPostingRepository;
import com.atsmatcher.repository.ResumeRepository;
import com.atsmatcher.repository.StudentProfileRepository;
import com.atsmatcher.repository.UserRepository;

@RestController
@RequestMapping("/api/matches")
public class MatchController {

    private final ResumeRepository resumeRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final JobPostingRepository jobPostingRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;

    @Value("${app.rag-service.url}")
    private String ragServiceUrl;

    public MatchController(ResumeRepository resumeRepository,
                            StudentProfileRepository studentProfileRepository,
                            JobPostingRepository jobPostingRepository,
                            UserRepository userRepository,
                            RestTemplate restTemplate) {
        this.resumeRepository = resumeRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.jobPostingRepository = jobPostingRepository;
        this.userRepository = userRepository;
        this.restTemplate = restTemplate;
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

        List<Map<String, Object>> results = new ArrayList<>();

        for (JobPosting posting : publishedPostings) {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> matchRequest = Map.of(
                    "resume_id", latestResume.getId().toString(),
                    "posting_id", posting.getId().toString()
            );
            HttpEntity<Map<String, Object>> matchEntity = new HttpEntity<>(matchRequest, headers);

            Map<String, Object> matchResult = restTemplate.postForObject(
                    ragServiceUrl + "/match", matchEntity, Map.class);

            String explanation;
            try {
                Map<String, Object> explainResult = restTemplate.postForObject(
                        ragServiceUrl + "/explain", matchEntity, Map.class);
                explanation = (String) explainResult.getOrDefault("explanation", "No explanation available");
            } catch (Exception e) {
                explanation = "Explanation temporarily unavailable";
            }

            results.add(Map.of(
                    "postingId", posting.getId(),
                    "title", posting.getTitle(),
                    "score", matchResult.getOrDefault("score", 0),
                    "explanation", explanation
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