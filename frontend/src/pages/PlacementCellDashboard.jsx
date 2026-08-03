import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAnalytics, publishPosting } from '../api/client.js';
import StatusTag from '../components/StatusTag.jsx';

const ALERT_CLASS =
  'font-mono text-xs text-brick bg-brick-bg border border-rule border-l-[3px] border-l-brick px-4 py-3 mb-6';

function formatTimestamp(iso) {
  if (!iso) return '';
  return iso.slice(0, 16).replace('T', ' ');
}

function StatTile({ label, value }) {
  return (
    <div className="border border-rule px-5 py-4">
      <p className="font-mono text-2xl text-ink mb-1">{value}</p>
      <p className="font-mono text-[0.65rem] uppercase tracking-wide text-ink-soft">{label}</p>
    </div>
  );
}

function ScoreBar({ score }) {
  const value = Number(score) || 0;
  const tone = value >= 70 ? 'bg-sage' : value >= 40 ? 'bg-brass' : 'bg-brick';
  return (
    <div className="w-full h-1 bg-rule mt-2">
      <div className={`h-full ${tone}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

export default function PlacementCellDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [publishingId, setPublishingId] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    getAnalytics()
      .then(setAnalytics)
      .catch(() => setError('The postings register could not be read. Is the backend running?'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handlePublish(id) {
    setPublishingId(id);
    setError(null);
    try {
      await publishPosting(id);
      load();
    } catch {
      setError('Publishing failed. Try again.');
    } finally {
      setPublishingId(null);
    }
  }

  const postings = analytics?.postings || [];

  return (
    <div className="page-shell">
      <p className="eyebrow">Placement office</p>
      <h1 className="font-display text-3xl font-medium mb-2">Postings register</h1>
      <p className="text-ink-soft text-sm mb-10 max-w-md">
        Every posting submitted by recruiters, from draft to published, with engagement so far.
        Publish a draft to open it to students.
      </p>

      {error && <div className={ALERT_CLASS}>{error}</div>}

      {analytics && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-rule border border-rule mb-3">
            <StatTile label="Postings" value={analytics.summary.totalPostings} />
            <StatTile label="Published" value={analytics.summary.publishedCount} />
            <StatTile label="Students" value={analytics.summary.totalStudents} />
            <StatTile label="Avg. match" value={`${analytics.summary.avgScoreOverall}%`} />
          </div>
          <p className="font-mono text-xs text-ink-soft mb-10">
            Scores are computed on demand, so a posting showing 0 scored may just mean no one has
            viewed it yet — not that no one is eligible.
          </p>
        </>
      )}

      <div className="border-t border-rule">
        {loading && <div className="py-12 text-center text-ink-soft font-mono text-sm">Reading the register…</div>}
        {!loading && postings.length === 0 && !error && (
          <div className="py-12 text-center text-ink-soft font-mono text-sm">
            No postings in the register yet. Recruiter submissions will appear here for review.
          </div>
        )}
        {!loading &&
          postings.map((p, i) => (
            <div
              key={p.postingId}
              className="grid grid-cols-[auto_1fr_auto] items-start gap-5 py-6 border-b border-rule opacity-0 animate-rowIn"
              style={{ animationDelay: `${i * 85}ms` }}
            >
              <StatusTag status={p.status} />
              <div>
                <h3 className="font-display text-lg font-medium mb-1.5">{p.title}</h3>
                <p className="font-mono text-xs tracking-wide uppercase text-ink-soft mt-1.5">
                  {p.recruiterEmail || 'Recruiter unknown'} · Filed {formatTimestamp(p.createdAt)}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="font-mono text-xs text-ink-soft">
                    {p.candidateCount} scored &middot; avg {p.avgScore}% &middot; top {p.topScore}%
                  </span>
                  {(p.eligibleBranches?.length > 0 || p.minCgpa) && (
                    <span className="font-mono text-xs text-brass">
                      {p.eligibleBranches?.join(', ')}
                      {p.minCgpa ? ` · ${p.minCgpa}+ CGPA` : ''}
                    </span>
                  )}
                </div>
                <ScoreBar score={p.avgScore} />
              </div>
              {p.status === 'DRAFT' ? (
                <div className="shrink-0">
                  <button
                    className="btn-primary-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                    onClick={() => handlePublish(p.postingId)}
                    disabled={publishingId === p.postingId}
                  >
                    {publishingId === p.postingId ? 'Publishing…' : 'Publish'}
                  </button>
                </div>
              ) : (
                <div className="shrink-0">
                  <Link
                    to={`/recruiter/postings/${p.postingId}/candidates`}
                    className="btn-primary-sm"
                  >
                    View candidates &rarr;
                  </Link>
                </div>
              )}
            </div>
          ))}
      </div>

      <div className="mt-16 flex items-start justify-between gap-6 border-t border-rule pt-10">
        <div>
          <p className="eyebrow">Enrollment</p>
          <h2 className="font-display text-2xl font-medium mb-2">Students register</h2>
          <p className="text-ink-soft text-sm max-w-md">
            Every registered student, resume status, and how they're scoring across published postings.
          </p>
        </div>
        <Link
          to="/placement-cell/students"
          className="btn-primary shrink-0"
        >
          View students &rarr;
        </Link>
      </div>
    </div>
  );
}
