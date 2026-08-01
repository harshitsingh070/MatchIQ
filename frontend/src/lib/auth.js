export const ROLE_ROUTES = {
  STUDENT: '/student',
  PLACEMENT_CELL: '/placement-cell',
  RECRUITER: '/recruiter',
};

export const ROLE_LABELS = {
  STUDENT: 'Student',
  PLACEMENT_CELL: 'Placement cell',
  RECRUITER: 'Recruiter',
};

export function getSession() {
  return {
    token: localStorage.getItem('token'),
    role: localStorage.getItem('role'),
    email: localStorage.getItem('email'),
  };
}

export function setSession({ token, role, email }) {
  localStorage.setItem('token', token);
  localStorage.setItem('role', role);
  localStorage.setItem('email', email);
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('email');
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem('token'));
}

export function homeForRole(role) {
  return ROLE_ROUTES[role] || '/';
}
