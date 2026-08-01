import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { login } from '../api/client.js';
import { getSession, homeForRole, isAuthenticated, setSession } from '../lib/auth.js';

const ALERT_CLASS =
  'font-mono text-xs text-brick bg-brick-bg border border-rule border-l-[3px] border-l-brick px-4 py-3 mb-6';

const LINK_CLASS =
  'font-mono text-xs uppercase tracking-wide text-brass no-underline border-b border-transparent pb-0.5 hover:border-brass transition-colors';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated()) {
    return <Navigate to={homeForRole(getSession().role)} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = await login(email, password);
      setSession({ token: data.token, role: data.role, email });
      navigate(homeForRole(data.role));
    } catch {
      setError('Sign-in failed. Check your email and password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-8 pt-12 pb-20">
      <p className="eyebrow">Placement register — Student affairs</p>
      <h1 className="font-display text-3xl font-medium mb-2">Sign in</h1>
      <p className="text-ink-soft text-sm mb-10 max-w-md">
        Enter your credentials to open the register for your role.
      </p>

      <form className="bg-paper-raised border border-rule p-6" onSubmit={handleSubmit} noValidate>
        {error && <div className={ALERT_CLASS}>{error}</div>}
        <div className="mb-6">
          <label className="field-label" htmlFor="email">Email</label>
          <input
            className="field-input"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="mb-6">
          <label className="field-label" htmlFor="password">Password</label>
          <input
            className="field-input"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <button className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="mt-6 text-xs">
          <span className="text-ink-soft">No account? </span>
          <Link className={LINK_CLASS} to="/register">Create account</Link>
        </p>
      </form>
    </div>
  );
}
