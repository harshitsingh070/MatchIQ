// backend/src/main/java/com/atsmatcher/repository/JobPostingRepository.java
package com.atsmatcher.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.atsmatcher.entity.JobPosting;

public interface JobPostingRepository extends JpaRepository<JobPosting, UUID> {
    List<JobPosting> findByStatus(JobPosting.Status status);
}