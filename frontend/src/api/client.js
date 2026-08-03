// Base API client. Backend runs on :8080; Vite proxies /api there (see vite.config.js).

import { clearSession } from '../lib/auth.js';

const BASE_URL = '/api';

function handleUnauthorized(token) {
  // A token was sent and the server rejected it (expired or invalid) —
  // the session is over. Drop it and return the user to the sign-in page.
  if (token) {
    clearSession();
    window.location.assign('/');
  }
}

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    // Only a 401 means the session itself is dead (expired/invalid token).
    // Other failures (e.g. a 403 because a fresh student has no resume yet)
    // are legitimate app-level errors and must NOT log the user out.
    if (res.status === 401) {
      handleUnauthorized(token);
    }
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

export function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function register(email, password, role) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, role }),
  });
}

// Student uploads a resume; the backend parses and embeds it (multipart,
// so it does not go through the JSON request helper).
export function uploadResume(file) {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);
  return fetch(`${BASE_URL}/resumes`, {
    method: 'POST',
    body: formData,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then(async (res) => {
    if (!res.ok) {
      if (res.status === 401) {
        handleUnauthorized(token);
      }
      throw new Error(`Request failed: ${res.status}`);
    }
    return res.json();
  });
}

// List postings. Students receive only published postings; recruiters and the
// placement cell receive everything.
export function getJobPostings() {
  return request('/postings');
}

// Recruiter creates a posting (starts as DRAFT).
export function createPosting(payload) {
  return request('/postings', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Recruiter edits their own DRAFT posting (published postings are rejected).
export function updatePosting(id, payload) {
  return request(`/postings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// Placement cell publishes a posting.
export function publishPosting(id) {
  return request(`/postings/${id}/publish`, { method: 'PUT' });
}

// Placement cell analytics: summary stats + per-posting performance.
export function getAnalytics() {
  return request('/placement-cell/analytics');
}

// Placement cell students register: every student, resume status, and how they
// score across published postings. Sorted resume-missing-first.
export function getStudents() {
  return request('/placement-cell/students');
}

// Placement cell drill-down into one student: profile, latest resume, and every
// posting they've been scored against.
export function getStudentDetail(email) {
  return request(`/placement-cell/students/${encodeURIComponent(email)}`);
}

// Recruiter-scoped stats: summary + per-posting performance for the signed-in
// recruiter's own postings only.
export function getMyPostingsStats() {
  return request('/recruiter/my-postings');
}

// Student's ranked matches: [{ postingId, title, score, explanation }].
export function getMyMatches() {
  return request('/matches/my');
}

// Score trend between the student's latest resume and the previous one.
export function getMyTrend() {
  return request('/matches/trend');
}

// Student's most recent resume (parsed sections + upload metadata), for the
// "your resume" panel on the dashboard.
export function getMyResume() {
  return request('/resumes/mine');
}

// Student's own eligibility profile ({ branch, cgpa }) and its updates.
export function getMyProfile() {
  return request('/students/me/profile');
}

export function updateMyProfile(payload) {
  return request('/students/me/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// Ranked candidates for one posting: [{ resumeId, studentEmail, branch, cgpa, score, explanation }].
export function getCandidates(postingId) {
  return request(`/postings/${postingId}/candidates`);
}
