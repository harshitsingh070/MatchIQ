import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getCandidates } from '../api/client.js';
import MatchSeal from '../components/MatchSeal.jsx';

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

  return (
    <div className="page-shell">
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
                {(c.branch || c.cgpa) && (
                  <p className="font-mono text-xs text-ink-soft mb-2">
                    {c.branch ?? 'Branch unknown'}
                    {c.cgpa ? ` \u00b7 CGPA ${c.cgpa}` : ''}
                  </p>
                )}
                <p className="text-ink-soft text-sm leading-relaxed max-w-[52ch]">{c.explanation}</p>
              </div>
              <MatchSeal score={c.score} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
