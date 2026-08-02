import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { register } from '../api/client.js';
import { ROLE_LABELS, ROLE_ROUTES, getSession, isAuthenticated, setSession } from '../lib/auth.js';

const ROLES = ['STUDENT', 'PLACEMENT_CELL', 'RECRUITER'];

const ALERT_CLASS =
  'font-mono text-xs text-brick bg-brick-bg border border-rule border-l-[3px] border-l-brick px-4 py-3 mb-6';

const LINK_CLASS =
  'font-mono text-xs uppercase tracking-wide text-brass no-underline border-b border-transparent pb-0.5 hover:border-brass transition-colors';

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Same guard as Login: only redirect when the stored session is complete.
  // A stale token with no valid role would loop forever - show the form.
  if (isAuthenticated() && ROLE_ROUTES[getSession().role]) {
    return <Navigate to={ROLE_ROUTES[getSession().role]} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await register(email, password, role);
      setSession({ token: data.token, role: data.role, email });
      navigate(ROLE_ROUTES[data.role]);
    } catch {
      setError('Registration failed. The email may already be registered.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-8 pt-12 pb-20">
      <p className="eyebrow">Placement register — New account</p>
      <h1 className="font-display text-3xl font-medium mb-2">Create account</h1>
      <p className="text-ink-soft text-sm mb-10 max-w-md">
        Register to open the register for your role.
      </p>

      <form className="bg-paper-raised border border-rule p-6" onSubmit={handleSubmit} noValidate>
        {error && <div className={ALERT_CLASS}>{error}</div>}
        <div className="mb-6">
          <label className="field-label" htmlFor="reg-email">Email</label>
          <input
            className="field-input"
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="mb-6">
          <label className="field-label" htmlFor="reg-password">Password</label>
          <input
            className="field-input"
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        <div className="mb-6">
          <label className="field-label" htmlFor="reg-role">Role</label>
          <select
            className="field-input"
            id="reg-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>
        <button className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed" type="submit" disabled={submitting}>
          {submitting ? 'Registering…' : 'Create account'}
        </button>
        <p className="mt-6 text-xs">
          <span className="text-ink-soft">Already registered? </span>
          <Link className={LINK_CLASS} to="/">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
