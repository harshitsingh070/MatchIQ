// backend/src/main/java/com/atsmatcher/repository/ResumeRepository.java
package com.atsmatcher.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.atsmatcher.entity.Resume;

public interface ResumeRepository extends JpaRepository<Resume, UUID> {
}