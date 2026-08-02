// backend/src/main/java/com/atsmatcher/repository/MatchResultRepository.java
package com.atsmatcher.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.atsmatcher.entity.MatchResult;

public interface MatchResultRepository extends JpaRepository<MatchResult, UUID> {
    Optional<MatchResult> findByResumeIdAndPostingId(UUID resumeId, UUID postingId);
    List<MatchResult> findByResumeId(UUID resumeId);
}
