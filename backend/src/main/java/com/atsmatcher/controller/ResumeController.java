// backend/src/main/java/com/atsmatcher/controller/ResumeController.java
package com.atsmatcher.controller;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import com.atsmatcher.entity.Resume;
import com.atsmatcher.entity.StudentProfile;
import com.atsmatcher.entity.User;
import com.atsmatcher.repository.ResumeRepository;
import com.atsmatcher.repository.StudentProfileRepository;
import com.atsmatcher.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;



@RestController
@RequestMapping("/api/resumes")
public class ResumeController {

    private final ResumeRepository resumeRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.rag-service.url}")
    private String ragServiceUrl;

    public ResumeController(ResumeRepository resumeRepository,
                             StudentProfileRepository studentProfileRepository,
                             UserRepository userRepository,
                             RestTemplate restTemplate) {
        this.resumeRepository = resumeRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.userRepository = userRepository;
        this.restTemplate = restTemplate;
    }

    @PostMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> uploadResume(@RequestParam("file") MultipartFile file,
                                           Authentication authentication) {
        // 1. Find the logged-in user (email comes from the JWT via JwtAuthFilter)
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 2. Find or create their StudentProfile
        StudentProfile profile = studentProfileRepository.findByUser(user)
                .orElseGet(() -> {
                    StudentProfile newProfile = new StudentProfile();
                    newProfile.setUser(user);
                    return studentProfileRepository.save(newProfile);
                });

        // 3. Forward the file to the Python RAG service for parsing
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", file.getResource());

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        Map<String, Object> parsed = restTemplate.postForObject(
                ragServiceUrl + "/parse-resume", requestEntity, Map.class);

        // 4. Save the resume with parsed data
        Resume resume = new Resume();
        resume.setStudent(profile);
        
        resume.setRawText((String) parsed.get("raw_text"));
        try {
    resume.setParsedSections(objectMapper.writeValueAsString(parsed.get("sections")));
} catch (Exception e) {
    resume.setParsedSections("{}");
}
        resumeRepository.save(resume);

        return ResponseEntity.ok(resume);
    }
}