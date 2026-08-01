import { Navigate } from 'react-router-dom';
import { getSession, homeForRole, isAuthenticated } from '../lib/auth.js';

export default function RequireAuth({ role, children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  const session = getSession();
  if (role && session.role !== role) {
    return <Navigate to={homeForRole(session.role)} replace />;
  }
  return children;
}
