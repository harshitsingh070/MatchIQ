import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getStudentDetail } from '../api/client.js';
import MatchSeal from '../components/MatchSeal.jsx';
import ResumePanel from '../components/ResumePanel.jsx';

export default function StudentDetail() {
  const { email } = useParams();
  const [detail, setDetail] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    setStatus('loading');
    getStudentDetail(email)
      .then((d) => {
        setDetail(d);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, [email]);

  if (status === 'loading') {
    return <p className="page-shell py-12 text-center text-ink-soft font-mono text-sm">Reading student&hellip;</p>;
  }

  if (status === 'error' || !detail) {
    return (
      <div className="page-shell">
        <Link
          to="/placement-cell/students"
          className="font-mono text-xs uppercase tracking-wide text-ink-soft no-underline hover:text-ink transition-colors inline-block mb-6"
        >
          &larr; Back to the students register
        </Link>
        <p className="py-12 text-center text-ink-soft font-mono text-sm">
          Couldn't load this student's details.
        </p>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <Link
        to="/placement-cell/students"
        className="font-mono text-xs uppercase tracking-wide text-ink-soft no-underline hover:text-ink transition-colors inline-block mb-6"
      >
        &larr; Back to the students register
      </Link>
      <p className="eyebrow">Placement office · Student</p>
      <h1 className="font-display text-3xl font-medium mb-2">{detail.email}</h1>
      <p className="font-mono text-xs text-ink-soft mb-10">
        {detail.branch ?? 'No branch set'}
        {detail.cgpa ? ` \u00b7 CGPA ${detail.cgpa}` : ' \u00b7 No CGPA set'}
        {' \u00b7 '}
        {!detail.hasResume ? (
          <span className="text-brick">No resume on file</span>
        ) : detail.profileComplete ? (
          <span className="text-sage">Profile complete</span>
        ) : (
          <span className="text-brass">Missing branch/CGPA — excluded from eligibility-filtered postings</span>
        )}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12">
        <div>
          <h2 className="font-display text-2xl font-medium mb-2">Posting matches</h2>
          <p className="text-ink-soft text-sm mb-8 max-w-md">
            Every posting this student has been scored against, highest match first.
          </p>

          <div className="border-t border-rule">
            {detail.matches.length === 0 && (
              <p className="py-12 text-center text-ink-soft font-mono text-sm">
                No match scores on file yet. Scores are computed when the student views their
                matches or a recruiter views the candidate list.
              </p>
            )}
            {detail.matches.map((m, i) => (
              <div
                key={m.postingId}
                className="grid grid-cols-[2.5rem_1fr_auto] items-start gap-5 py-6 border-b border-rule opacity-0 animate-rowIn"
                style={{ animationDelay: `${i * 85}ms` }}
              >
                <span className="font-mono text-xs text-brass pt-1">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="font-display text-lg font-medium mb-1">{m.title}</h3>
                  <p className="font-mono text-xs tracking-wide uppercase text-ink-soft mb-2">
                    {m.status.toLowerCase()}
                  </p>
                  <p className="text-ink-soft text-sm leading-relaxed max-w-[52ch]">{m.explanation}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {m.presentSkills?.length > 0 &&
                      m.presentSkills.map((s) => (
                        <span
                          key={`p-${m.postingId}-${s}`}
                          className="text-xs font-mono px-2 py-0.5 rounded-sm bg-sage text-paper-raised"
                        >
                          {s}
                        </span>
                      ))}
                    {m.missingSkills?.length > 0 &&
                      m.missingSkills.map((s) => (
                        <span
                          key={`m-${m.postingId}-${s}`}
                          className="text-xs font-mono px-2 py-0.5 rounded-sm bg-brick text-paper-raised"
                        >
                          missing: {s}
                        </span>
                      ))}
                  </div>
                </div>
                <MatchSeal score={m.score} />
              </div>
            ))}
          </div>
        </div>

        <aside className="border-l border-rule pl-8 lg:sticky lg:top-8 lg:self-start lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
          <div className="mb-4">
            <p className="eyebrow">On file</p>
            <h2 className="font-display text-lg font-medium">Resume</h2>
          </div>
          <ResumePanel resume={detail.resume ?? { hasResume: false }} />
        </aside>
      </div>
    </div>
  );
}
