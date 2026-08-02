import { useEffect, useRef, useState } from 'react';
import { getJobPostings, getMyMatches, uploadResume } from '../api/client.js';
import MatchSeal from '../components/MatchSeal.jsx';
import ResumePanel from '../components/ResumePanel.jsx';

const ALERT_CLASS =
  'font-mono text-xs text-brick bg-brick-bg border border-rule border-l-[3px] border-l-brick px-4 py-3 mb-6';

const TONE_KEY = [
  { tone: 'bg-sage', label: 'Strong' },
  { tone: 'bg-brass', label: 'Moderate' },
  { tone: 'bg-brick', label: 'Weak' },
];

export default function StudentDashboard() {
  const [matches, setMatches] = useState([]);
  const [postingCount, setPostingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const fileInputRef = useRef(null);

  function loadMatches() {
    setLoading(true);
    setError(null);
    Promise.all([getMyMatches(), getJobPostings()])
      .then(([matchList, postings]) => {
        setMatches(matchList);
        setPostingCount(postings.length);
      })
      .catch(() =>
        setError(
          'The match register could not be read. If you have not uploaded a resume yet, upload one below.'
        )
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadMatches();
  }, []);

  async function handleUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      await uploadResume(file);
      e.target.value = '';
      setRefreshKey((k) => k + 1);
      loadMatches();
    } catch {
      setError('Resume upload failed. The parsing service may be unavailable; try again shortly.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="page-shell max-w-5xl">
      <p className="eyebrow">Candidate register — Ranked by fit</p>
      <h1 className="font-display text-3xl font-medium mb-2">Your matches</h1>
      <p className="text-ink-soft text-sm mb-10 max-w-md">
        Postings published by the placement cell, scored against your resume. Rank reflects match strength.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
        <div>
          <div className="bg-paper-raised border border-rule p-6 mb-8">
            <div className="mb-6">
              <label className="field-label" htmlFor="resume-file">Resume (PDF)</label>
              <input
                ref={fileInputRef}
                className="field-input py-1.5 text-ink-soft file:font-mono file:text-xs file:font-semibold file:tracking-wider file:uppercase file:text-paper-raised file:bg-ink file:border-0 file:rounded-sm file:px-3.5 file:py-2.5 file:mr-3.5 file:cursor-pointer disabled:opacity-60"
                id="resume-file"
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleUpload}
                disabled={uploading}
              />
            </div>
          </div>

          {error && <div className={ALERT_CLASS}>{error}</div>}

          <div className="border-t border-rule">
            <p className="font-mono text-xs text-ink-soft py-4 flex items-center gap-5">
              <span className="uppercase tracking-widest">Score key</span>
              {TONE_KEY.map(({ tone, label }) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${tone}`} />
                  {label}
                </span>
              ))}
            </p>
            {loading && <div className="py-12 text-center text-ink-soft font-mono text-sm">Reading the register…</div>}
            {!loading && matches.length === 0 && !error && (
              postingCount > 0 ? (
                <div className="py-12 text-center text-ink-soft font-mono text-sm max-w-md mx-auto">
                  You're eligible for {postingCount} published posting{postingCount === 1 ? '' : 's'},
                  but no match scores are showing yet. If you've just uploaded a resume, re-check shortly.
                </div>
              ) : (
                <div className="py-12 text-center text-ink-soft font-mono text-sm">
                  No published postings match your eligibility yet. Check back when the placement cell publishes new postings.
                </div>
              )
            )}
            {!loading &&
              matches.map((m, i) => (
                <div
                  key={m.postingId}
                  className="grid grid-cols-[2.5rem_1fr_auto] items-start gap-5 py-6 border-b border-rule opacity-0 animate-rowIn"
                  style={{ animationDelay: `${i * 85}ms` }}
                >
                  <span className="font-mono text-xs text-brass pt-1">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 className="font-display text-lg font-medium mb-1.5">{m.title}</h3>
                    <p className="text-ink-soft text-sm leading-relaxed max-w-[52ch]">{m.explanation}</p>
                  </div>
                  <MatchSeal score={m.score} />
                </div>
              ))}
          </div>
        </div>

        <aside className="border-l border-rule pl-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="eyebrow">On file</p>
              <h2 className="font-display text-lg font-medium">Your resume</h2>
            </div>
            <button
              type="button"
              className="btn-primary-sm"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              disabled={uploading}
            >
              Replace resume
            </button>
          </div>
          <ResumePanel refreshKey={refreshKey} />
        </aside>
      </div>
    </div>
  );
}
