import { Navigate } from 'react-router-dom';
import { getSession, homeForRole, isAuthenticated } from '../lib/auth.js';

export default function RequireAuth({ role, roles, children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  const session = getSession();
  const allowed = roles ? roles.includes(session.role) : !role || session.role === role;
  if (!allowed) {
    return <Navigate to={homeForRole(session.role)} replace />;
  }
  return children;
}
