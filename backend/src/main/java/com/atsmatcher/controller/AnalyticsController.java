// backend/src/main/java/com/atsmatcher/controller/AnalyticsController.java
package com.atsmatcher.controller;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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

@RestController
@RequestMapping("/api/placement-cell")
public class AnalyticsController {

    private final JobPostingRepository jobPostingRepository;
    private final ResumeRepository resumeRepository;
    private final MatchResultRepository matchResultRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final UserRepository userRepository;
    private final EligibilityService eligibilityService;

    public AnalyticsController(JobPostingRepository jobPostingRepository,
                               ResumeRepository resumeRepository,
                               MatchResultRepository matchResultRepository,
                               StudentProfileRepository studentProfileRepository,
                               UserRepository userRepository,
                               EligibilityService eligibilityService) {
        this.jobPostingRepository = jobPostingRepository;
        this.resumeRepository = resumeRepository;
        this.matchResultRepository = matchResultRepository;
        this.studentProfileRepository = studentProfileRepository;
        this.userRepository = userRepository;
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

    // Placement cell students register: every student, resume status, and how
    // they score across published postings. Read-only — the placement cell
    // monitors here, it does not manage student profiles.
    @GetMapping("/students")
    @PreAuthorize("hasRole('PLACEMENT_CELL')")
    public List<Map<String, Object>> getStudents() {
        List<User> studentUsers = userRepository.findAll().stream()
                .filter(u -> u.getRole() == User.Role.STUDENT)
                .toList();

        List<MatchResult> allMatchResults = matchResultRepository.findAll();
        List<Resume> allResumes = resumeRepository.findAll();

        List<Map<String, Object>> result = new ArrayList<>();

        for (User user : studentUsers) {
            StudentProfile profile = studentProfileRepository.findByUser(user).orElse(null);

            boolean profileComplete = profile != null
                    && profile.getBranch() != null
                    && profile.getCgpa() != null;

            Resume latestResume = profile == null ? null :
                    allResumes.stream()
                            .filter(r -> r.getStudent().getId().equals(profile.getId()))
                            .max(Comparator.comparing(Resume::getUploadedAt))
                            .orElse(null);

            List<MatchResult> resultsForStudent = latestResume == null ? List.of() :
                    allMatchResults.stream()
                            .filter(r -> r.getResumeId().equals(latestResume.getId()))
                            .toList();

            double avgScore = resultsForStudent.isEmpty() ? 0 :
                    resultsForStudent.stream().mapToDouble(r -> r.getScore().doubleValue()).average().orElse(0);
            double topScore = resultsForStudent.stream()
                    .mapToDouble(r -> r.getScore().doubleValue()).max().orElse(0);

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("email", user.getEmail());
            row.put("branch", profile != null ? profile.getBranch() : null);
            row.put("cgpa", profile != null ? profile.getCgpa() : null);
            row.put("profileComplete", profileComplete);
            row.put("hasResume", latestResume != null);
            row.put("resumeUploadedAt", latestResume != null ? latestResume.getUploadedAt().toString() : null);
            row.put("postingsScored", resultsForStudent.size());
            row.put("avgScore", Math.round(avgScore * 10.0) / 10.0);
            row.put("topScore", Math.round(topScore * 10.0) / 10.0);

            result.add(row);
        }

        // Students without a resume float to the top - most actionable info for
        // placement cell: who hasn't engaged with the system yet.
        result.sort((a, b) -> Boolean.compare((Boolean) a.get("hasResume"), (Boolean) b.get("hasResume")));

        return result;
    }

    // Placement cell student drill-down: profile, latest resume (parsed sections
    // + raw text), and every posting they've been scored against. Read-only.
    @GetMapping("/students/{email}")
    @PreAuthorize("hasRole('PLACEMENT_CELL')")
    public Map<String, Object> getStudentDetail(@PathVariable String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        if (user.getRole() != User.Role.STUDENT) {
            throw new RuntimeException("Not a student");
        }

        StudentProfile profile = studentProfileRepository.findByUser(user).orElse(null);

        boolean profileComplete = profile != null
                && profile.getBranch() != null
                && profile.getCgpa() != null;

        Resume latestResume = profile == null ? null :
                resumeRepository.findAll().stream()
                        .filter(r -> r.getStudent().getId().equals(profile.getId()))
                        .max(Comparator.comparing(Resume::getUploadedAt))
                        .orElse(null);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("email", user.getEmail());
        response.put("branch", profile != null ? profile.getBranch() : null);
        response.put("cgpa", profile != null ? profile.getCgpa() : null);
        response.put("profileComplete", profileComplete);
        response.put("hasResume", latestResume != null);

        if (latestResume == null) {
            response.put("resume", null);
            response.put("matches", List.of());
            return response;
        }

        Map<String, Object> resume = new LinkedHashMap<>();
        resume.put("hasResume", true);
        resume.put("fileName", latestResume.getFileName());
        resume.put("uploadedAt", latestResume.getUploadedAt().toString());
        resume.put("parsedSections", latestResume.getParsedSections() != null ? latestResume.getParsedSections() : "{}");
        resume.put("rawText", latestResume.getRawText() != null ? latestResume.getRawText() : "");
        response.put("resume", resume);

        List<Map<String, Object>> matches = new ArrayList<>();
        for (MatchResult result : matchResultRepository.findByResumeId(latestResume.getId())) {
            JobPosting posting = jobPostingRepository.findById(result.getPostingId()).orElse(null);
            if (posting == null) {
                continue;
            }

            matches.add(Map.of(
                    "postingId", posting.getId(),
                    "title", posting.getTitle(),
                    "status", posting.getStatus().name(),
                    "score", result.getScore().doubleValue(),
                    "explanation", result.getExplanation() != null ? result.getExplanation() : "",
                    "presentSkills", splitSkills(result.getPresentSkills()),
                    "missingSkills", splitSkills(result.getMissingSkills())
            ));
        }

        matches.sort((a, b) -> Double.compare(
                ((Number) b.get("score")).doubleValue(),
                ((Number) a.get("score")).doubleValue()));

        response.put("matches", matches);
        return response;
    }

    private List<String> splitSkills(String joined) {
        if (joined == null || joined.isBlank()) {
            return List.of();
        }
        return java.util.Arrays.stream(joined.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }
}
