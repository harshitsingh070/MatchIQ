import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCandidates } from '../api/client.js';
import MatchSeal from '../components/MatchSeal.jsx';
import { getSession } from '../lib/auth.js';

export default function PostingCandidates() {
  const { id } = useParams();
  const [candidates, setCandidates] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    getCandidates(id)
      .then((data) => {
        setCandidates(data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [id]);

  const session = getSession();
  const back =
    session.role === 'RECRUITER'
      ? { to: '/recruiter', label: 'Back to your postings' }
      : { to: '/placement-cell', label: 'Back to the postings register' };

  return (
    <div className="page-shell">
      <Link
        to={back.to}
        className="font-mono text-xs uppercase tracking-wide text-ink-soft no-underline hover:text-ink transition-colors inline-block mb-6"
      >
        &larr; {back.label}
      </Link>
      <p className="eyebrow">Candidate register &mdash; ranked by fit</p>
      <h1 className="font-display text-3xl font-medium mb-2">Candidates</h1>
      <p className="text-ink-soft text-sm mb-10 max-w-md">
        Every student resume on file, scored against this posting, ranked highest match first.
      </p>

      {status === 'loading' && <p className="py-12 text-center text-ink-soft font-mono text-sm">Reading the register&hellip;</p>}
      {status === 'error' && (
        <p className="py-12 text-center text-ink-soft font-mono text-sm">
          Couldn't load candidates for this posting.
        </p>
      )}
      {status === 'ready' && candidates.length === 0 && (
        <p className="py-12 text-center text-ink-soft font-mono text-sm">
          No candidate resumes on file yet.
        </p>
      )}

      {status === 'ready' && candidates.length > 0 && (
        <div className="border-t border-rule">
          {candidates.map((c, i) => (
            <div
              className="grid grid-cols-[2.5rem_1fr_auto] items-start gap-5 py-6 border-b border-rule opacity-0 animate-rowIn"
              key={c.resumeId}
              style={{ animationDelay: `${i * 85}ms` }}
            >
              <span className="font-mono text-xs text-brass pt-1">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <h3 className="font-display text-lg font-medium mb-1.5">{c.studentEmail}</h3>
                <p className="font-mono text-xs text-ink-soft mb-2">
                  {c.branch ?? 'No branch set'}
                  {c.cgpa ? ` \u00b7 CGPA ${c.cgpa}` : ' \u00b7 No CGPA set'}
                </p>
                {(!c.branch || !c.cgpa) && (
                  <p className="font-mono text-xs text-brass mb-2">
                    {!c.branch && !c.cgpa
                      ? 'Missing branch and CGPA'
                      : !c.branch
                        ? 'Missing branch'
                        : 'Missing CGPA'}
                    {' — excluded from eligibility-filtered postings'}
                  </p>
                )}
                <p className="text-ink-soft text-sm leading-relaxed max-w-[52ch]">{c.explanation}</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {c.presentSkills?.length > 0 &&
                    c.presentSkills.map((s) => (
                      <span
                        key={`p-${c.resumeId}-${s}`}
                        className="text-xs font-mono px-2 py-0.5 rounded-sm bg-sage text-paper-raised"
                      >
                        {s}
                      </span>
                    ))}
                  {c.missingSkills?.length > 0 &&
                    c.missingSkills.map((s) => (
                      <span
                        key={`m-${c.resumeId}-${s}`}
                        className="text-xs font-mono px-2 py-0.5 rounded-sm bg-brick text-paper-raised"
                      >
                        missing: {s}
                      </span>
                    ))}
                </div>
              </div>
              <MatchSeal score={c.score} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
