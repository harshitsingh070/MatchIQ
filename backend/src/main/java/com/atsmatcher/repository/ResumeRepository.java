// backend/src/main/java/com/atsmatcher/repository/ResumeRepository.java
package com.atsmatcher.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.atsmatcher.entity.Resume;
import com.atsmatcher.entity.StudentProfile;

public interface ResumeRepository extends JpaRepository<Resume, UUID> {
    Optional<Resume> findTopByStudentOrderByUploadedAtDesc(StudentProfile student);
    List<Resume> findByStudentOrderByUploadedAtDesc(StudentProfile student);
}
