// backend/src/main/java/com/atsmatcher/service/EligibilityService.java
package com.atsmatcher.service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.atsmatcher.entity.JobPosting;
import com.atsmatcher.entity.StudentProfile;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class EligibilityService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    public Map<String, Object> parseEligibility(String criteriaJson) {
        if (criteriaJson == null || criteriaJson.isBlank()) {
            return Map.of();
        }
        try {
            return objectMapper.readValue(criteriaJson, Map.class);
        } catch (Exception e) {
            return Map.of();
        }
    }

    public boolean isEligible(JobPosting posting, StudentProfile student) {
        String criteriaJson = posting.getEligibilityCriteria();
        if (criteriaJson == null || criteriaJson.isBlank()) {
            return true; // no restrictions set - open to everyone
        }

        try {
            Map<String, Object> criteria = objectMapper.readValue(criteriaJson, Map.class);

            // Branch check
            Object branchesObj = criteria.get("branches");
            if (branchesObj instanceof List<?> branches && !branches.isEmpty()) {
                if (student == null || student.getBranch() == null || !branches.contains(student.getBranch())) {
                    return false;
                }
            }

            // CGPA check
            Object minCgpaObj = criteria.get("minCgpa");
            if (minCgpaObj != null) {
                BigDecimal minCgpa = new BigDecimal(minCgpaObj.toString());
                if (student == null || student.getCgpa() == null || student.getCgpa().compareTo(minCgpa) < 0) {
                    return false;
                }
            }

            return true;
        } catch (Exception e) {
            // malformed criteria JSON - fail open rather than hiding postings due to a data bug
            return true;
        }
    }
}
