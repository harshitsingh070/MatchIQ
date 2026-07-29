// Base API client. Backend runs on :8080; Vite proxies /api there (see vite.config.js).

const BASE_URL = '/api';

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
    throw new Error(`Request failed: ${res.status}`);
  }
  return res.json();
}

// TODO: implement once AuthController exists on the backend
export function login(email, password) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// TODO: implement once resume upload endpoint exists
export function uploadResume(file) {
  const formData = new FormData();
  formData.append('file', file);
  return fetch(`${BASE_URL}/resumes`, { method: 'POST', body: formData }).then((r) => r.json());
}

// TODO: implement once job postings endpoint exists
export function getJobPostings() {
  return request('/postings');
}

// TODO: implement once match results endpoint exists
export function getMatchResults(resumeId) {
  return request(`/matches?resumeId=${resumeId}`);
}
