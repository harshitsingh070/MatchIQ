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
    handleUnauthorized(token);
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
      handleUnauthorized(token);
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

// Placement cell publishes a posting.
export function publishPosting(id) {
  return request(`/postings/${id}/publish`, { method: 'PUT' });
}

// Student's ranked matches: [{ postingId, title, score, explanation }].
export function getMyMatches() {
  return request('/matches/my');
}
