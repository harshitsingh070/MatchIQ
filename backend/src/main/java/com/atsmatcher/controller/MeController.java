package com.atsmatcher.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MeController {

    @GetMapping("/api/me")
    @PreAuthorize("hasRole('STUDENT')")
    public String me(Authentication authentication) {
        return "You are: " + authentication.getName() + " | authorities: " + authentication.getAuthorities();
    }
}