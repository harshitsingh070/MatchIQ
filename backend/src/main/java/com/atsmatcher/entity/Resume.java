// backend/src/main/java/com/atsmatcher/entity/Resume.java
package com.atsmatcher.entity;

import java.time.LocalDateTime;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "resumes")
public class Resume {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "student_id", nullable = false)
    private StudentProfile student;

    @Column(name = "raw_text", columnDefinition = "TEXT")
    private String rawText;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "parsed_sections")
    private String parsedSections; // stored as a JSON string

    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt = LocalDateTime.now();

    // Getters and setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public StudentProfile getStudent() { return student; }
    public void setStudent(StudentProfile student) { this.student = student; }
    public String getRawText() { return rawText; }
    public void setRawText(String rawText) { this.rawText = rawText; }
    public String getParsedSections() { return parsedSections; }
    public void setParsedSections(String parsedSections) { this.parsedSections = parsedSections; }
    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }
}