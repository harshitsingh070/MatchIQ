// backend/src/main/java/com/atsmatcher/repository/StudentProfileRepository.java
package com.atsmatcher.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.atsmatcher.entity.StudentProfile;
import com.atsmatcher.entity.User;

public interface StudentProfileRepository extends JpaRepository<StudentProfile, UUID> {
    Optional<StudentProfile> findByUser(User user);
}