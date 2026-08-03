// backend/src/main/java/com/atsmatcher/controller/StudentProfileController.java
package com.atsmatcher.controller;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.atsmatcher.dto.StudentProfileRequest;
import com.atsmatcher.entity.StudentProfile;
import com.atsmatcher.entity.User;
import com.atsmatcher.repository.StudentProfileRepository;
import com.atsmatcher.repository.UserRepository;

// Students manage their own eligibility profile (branch + CGPA). These fields
// decide which published postings they're shown, so they must be editable by
// the student rather than only writable by an admin.
@RestController
@RequestMapping("/api/students/me/profile")
public class StudentProfileController {

    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;

    public StudentProfileController(UserRepository userRepository,
                                    StudentProfileRepository studentProfileRepository) {
        this.userRepository = userRepository;
        this.studentProfileRepository = studentProfileRepository;
    }

    @GetMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> getMyProfile(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        StudentProfile profile = studentProfileRepository.findByUser(user).orElse(null);

        Map<String, Object> body = new HashMap<>();
        body.put("branch", profile != null ? profile.getBranch() : null);
        body.put("cgpa", profile != null ? profile.getCgpa() : null);
        return ResponseEntity.ok(body);
    }

    @PutMapping
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> updateMyProfile(@RequestBody StudentProfileRequest req, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Normalize branch to uppercase so it matches recruiter-entered values
        // (posting eligibility uses exact string comparison).
        String branch = req.getBranch() == null ? null : req.getBranch().trim().toUpperCase();
        BigDecimal cgpa = req.getCgpa();

        if (cgpa != null && (cgpa.compareTo(BigDecimal.ZERO) < 0 || cgpa.compareTo(BigDecimal.TEN) > 0)) {
            return ResponseEntity.badRequest().body("CGPA must be between 0 and 10");
        }

        StudentProfile profile = studentProfileRepository.findByUser(user).orElse(null);
        if (profile == null) {
            profile = new StudentProfile();
            profile.setUser(user);
        }

        profile.setBranch(branch);
        profile.setCgpa(cgpa);
        studentProfileRepository.save(profile);

        Map<String, Object> body = new HashMap<>();
        body.put("branch", profile.getBranch());
        body.put("cgpa", profile.getCgpa());
        return ResponseEntity.ok(body);
    }
}
