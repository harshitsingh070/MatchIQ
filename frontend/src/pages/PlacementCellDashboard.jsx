import { useEffect, useState } from 'react';
import { getJobPostings, publishPosting } from '../api/client.js';
import StatusTag from '../components/StatusTag.jsx';

const ALERT_CLASS =
  'font-mono text-xs text-brick bg-brick-bg border border-rule border-l-[3px] border-l-brick px-4 py-3 mb-6';

function formatTimestamp(iso) {
  if (!iso) return '';
  return iso.slice(0, 16).replace('T', ' ');
}

export default function PlacementCellDashboard() {
  const [postings, setPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [publishingId, setPublishingId] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    getJobPostings()
      .then(setPostings)
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

  return (
    <div className="page-shell">
      <p className="eyebrow">Placement office</p>
      <h1 className="font-display text-3xl font-medium mb-2">Postings register</h1>
      <p className="text-ink-soft text-sm mb-10 max-w-md">
        Every posting submitted by recruiters, from draft to published. Publish a draft to open it to students.
      </p>

      {error && <div className={ALERT_CLASS}>{error}</div>}

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
              key={p.id}
              className="grid grid-cols-[auto_1fr_auto] items-start gap-5 py-6 border-b border-rule opacity-0 animate-rowIn"
              style={{ animationDelay: `${i * 85}ms` }}
            >
              <StatusTag status={p.status} />
              <div>
                <h3 className="font-display text-lg font-medium mb-1.5">{p.title}</h3>
                <p className="font-mono text-xs tracking-wide uppercase text-ink-soft mt-1.5">
                  {p.recruiter?.email || 'Recruiter unknown'} · Filed {formatTimestamp(p.createdAt)}
                </p>
              </div>
              {p.status === 'DRAFT' && (
                <div className="shrink-0">
                  <button
                    className="btn-primary-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                    onClick={() => handlePublish(p.id)}
                    disabled={publishingId === p.id}
                  >
                    {publishingId === p.id ? 'Publishing…' : 'Publish'}
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
