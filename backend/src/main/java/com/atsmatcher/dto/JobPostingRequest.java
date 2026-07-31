// backend/src/main/java/com/atsmatcher/dto/JobPostingRequest.java
package com.atsmatcher.dto;

public class JobPostingRequest {
    private String title;
    private String description;
    private String requiredSkills;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getRequiredSkills() { return requiredSkills; }
    public void setRequiredSkills(String requiredSkills) { this.requiredSkills = requiredSkills; }
}