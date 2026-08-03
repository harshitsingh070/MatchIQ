import { Link, useNavigate } from 'react-router-dom';
import {
  ROLE_LABELS,
  clearSession,
  getSession,
  homeForRole,
  isAuthenticated,
} from '../lib/auth.js';

const NAV_LINK_CLASS =
  'text-ink-soft text-xs tracking-wide uppercase no-underline border-b border-transparent pb-0.5 hover:text-ink hover:border-brass transition-colors';

// Role-specific destination for each user's home dashboard.
const ROLE_NAV = {
  STUDENT: [{ label: 'My matches', to: '/student' }],
  RECRUITER: [{ label: 'Postings', to: '/recruiter' }],
  PLACEMENT_CELL: [
    { label: 'Postings register', to: '/placement-cell' },
    { label: 'Students register', to: '/placement-cell/students' },
  ],
};

const SIGN_OUT_CLASS =
  'text-ink-soft text-xs tracking-wide uppercase cursor-pointer bg-transparent border-0 border-b border-transparent pb-0.5 hover:text-ink hover:border-brass transition-colors';

export default function AppHeader() {
  const navigate = useNavigate();
  const authed = isAuthenticated();
  const session = getSession();

  function handleSignOut() {
    clearSession();
    navigate('/');
  }

  return (
    <nav className="sticky top-0 z-50 flex w-full items-baseline justify-between px-10 py-6 border-b border-rule bg-paper-raised">
      <Link
        to={authed ? homeForRole(session.role) : '/'}
        className="font-display text-xl font-semibold text-ink no-underline"
      >
        ATS Matcher
      </Link>
      <div className="flex items-baseline gap-6">
        {authed ? (
          <>
            <span className="font-mono text-xs tracking-widest uppercase text-ink-soft">
              {ROLE_LABELS[session.role] || session.role} · {session.email}
            </span>
            <div className="flex items-baseline gap-6">
              {ROLE_NAV[session.role]?.map((item) => (
                <Link key={item.label} to={item.to} className={NAV_LINK_CLASS}>
                  {item.label}
                </Link>
              ))}
            </div>
            <button type="button" onClick={handleSignOut} className={SIGN_OUT_CLASS}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link className={NAV_LINK_CLASS} to="/">Sign in</Link>
            <Link className={NAV_LINK_CLASS} to="/register">Create account</Link>
          </>
        )}
      </div>
    </nav>
  );
}
