// backend/src/main/java/com/atsmatcher/dto/JobPostingRequest.java
package com.atsmatcher.dto;

import java.math.BigDecimal;
import java.util.List;

public class JobPostingRequest {
    private String title;
    private String description;
    private String requiredSkills;
    private List<String> eligibleBranches;
    private BigDecimal minCgpa;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getRequiredSkills() { return requiredSkills; }
    public void setRequiredSkills(String requiredSkills) { this.requiredSkills = requiredSkills; }
    public List<String> getEligibleBranches() { return eligibleBranches; }
    public void setEligibleBranches(List<String> eligibleBranches) { this.eligibleBranches = eligibleBranches; }
    public BigDecimal getMinCgpa() { return minCgpa; }
    public void setMinCgpa(BigDecimal minCgpa) { this.minCgpa = minCgpa; }
}
