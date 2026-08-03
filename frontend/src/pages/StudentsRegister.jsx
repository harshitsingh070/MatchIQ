import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStudents } from '../api/client.js';

const ALERT_CLASS =
  'font-mono text-xs text-brick bg-brick-bg border border-rule border-l-[3px] border-l-brick px-4 py-3 mb-6';

export default function StudentsRegister() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getStudents()
      .then(setStudents)
      .catch(() => setError('The students register could not be read. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-shell">
      <Link
        to="/placement-cell"
        className="font-mono text-xs uppercase tracking-wide text-ink-soft no-underline hover:text-ink transition-colors inline-block mb-6"
      >
        &larr; Back to the postings register
      </Link>
      <p className="eyebrow">Placement office · Enrollment</p>
      <h1 className="font-display text-3xl font-medium mb-2">Students register</h1>
      <p className="text-ink-soft text-sm mb-10 max-w-md">
        Every registered student, resume status, and how they're scoring across published postings.
        Students without a resume are listed first.
      </p>

      {error && <div className={ALERT_CLASS}>{error}</div>}

      <div className="border-t border-rule">
        {loading && <div className="py-12 text-center text-ink-soft font-mono text-sm">Reading the register…</div>}
        {!loading && students.length === 0 && !error && (
          <div className="py-12 text-center text-ink-soft font-mono text-sm">
            No students registered yet.
          </div>
        )}
        {!loading &&
          students.map((s, i) => (
            <div
              key={s.email}
              className="grid grid-cols-[1fr_auto] items-start gap-5 py-5 border-b border-rule opacity-0 animate-rowIn"
              style={{ animationDelay: `${i * 85}ms` }}
            >
              <div>
                <p className="font-display text-base font-medium mb-1">{s.email}</p>
                <p className="font-mono text-xs text-ink-soft">
                  {s.branch ?? 'No branch set'} {s.cgpa ? `\u00b7 CGPA ${s.cgpa}` : '\u00b7 No CGPA set'}
                </p>
                {s.hasResume && !s.profileComplete && (
                  <p className="font-mono text-xs text-brass mt-1">
                    Missing branch/CGPA — excluded from eligibility-filtered postings
                  </p>
                )}
              </div>

              <div className="text-right">
                {!s.hasResume ? (
                  <span className="font-mono text-xs px-2 py-1 bg-brick-bg text-brick">No resume</span>
                ) : (
                  <>
                    <span className="font-mono text-xs px-2 py-1 bg-sage-bg text-sage">Resume on file</span>
                    <p className="font-mono text-xs text-ink-soft mt-1.5">
                      {s.postingsScored} scored &middot; avg {s.avgScore}%
                    </p>
                  </>
                )}
                <Link
                  to={`/placement-cell/students/${encodeURIComponent(s.email)}`}
                  className="btn-primary-sm mt-3"
                >
                  View details
                </Link>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
