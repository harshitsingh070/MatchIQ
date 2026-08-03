import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPosting, getMyPostingsStats, updatePosting } from '../api/client.js';
import StatusTag from '../components/StatusTag.jsx';

const EMPTY_FORM = { title: '', description: '', requiredSkills: '', eligibleBranches: '', minCgpa: '' };

const ALERT_CLASS =
  'font-mono text-xs text-brick bg-brick-bg border border-rule border-l-[3px] border-l-brick px-4 py-3 mb-6';

const SECTION_CLASS = 'font-mono text-xs font-semibold tracking-widest uppercase text-ink-soft mt-10 mb-4';

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

export default function RecruiterDashboard() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    getMyPostingsStats()
      .then(setStats)
      .catch(() => setError('Your postings could not be read. Is the backend running?'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        requiredSkills: form.requiredSkills.trim(),
        eligibleBranches: form.eligibleBranches
          ? form.eligibleBranches.split(',').map((b) => b.trim()).filter(Boolean)
          : [],
        minCgpa: form.minCgpa ? parseFloat(form.minCgpa) : null,
      };
      if (editingId) {
        await updatePosting(editingId, payload);
      } else {
        await createPosting(payload);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      load();
    } catch {
      setError(
        editingId
          ? 'The draft could not be updated. Check the required fields and try again.'
          : 'The posting could not be saved. Check the required fields and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(posting) {
    setForm({
      title: posting.title,
      description: posting.description,
      requiredSkills: posting.requiredSkills || '',
      eligibleBranches: (posting.eligibleBranches || []).join(', '),
      minCgpa: posting.minCgpa != null ? String(posting.minCgpa) : '',
    });
    setEditingId(posting.postingId);
    setError(null);
  }

  function cancelEditing() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
  }

  const postings = stats?.postings || [];

  return (
    <div className="page-shell">
      <p className="eyebrow">Recruiter desk</p>
      <h1 className="font-display text-3xl font-medium mb-2">Your postings</h1>
      <p className="text-ink-soft text-sm mb-10 max-w-md">
        Draft a posting below. The placement cell reviews and publishes it before students can see it.
      </p>

      {error && <div className={ALERT_CLASS}>{error}</div>}

      {stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-rule border border-rule mb-3">
            <StatTile label="My postings" value={stats.summary.totalPostings} />
            <StatTile label="Published" value={stats.summary.publishedCount} />
            <StatTile label="Candidates scored" value={stats.summary.totalCandidatesScored} />
            <StatTile label="Avg. match" value={`${stats.summary.avgScoreAcrossPostings}%`} />
          </div>
          <p className="font-mono text-xs text-ink-soft mb-10">
            Scores are computed on demand, so a posting showing 0 scored may just mean no one has
            viewed it yet — not that no one is eligible.
          </p>
        </>
      )}

      <h2 className={SECTION_CLASS}>{editingId ? 'Edit draft' : 'New posting'}</h2>
      {editingId && (
        <p className="font-mono text-xs text-brass mb-4">
          Editing a draft — published postings cannot be edited.
        </p>
      )}
      <form className="bg-paper-raised border border-rule p-6" onSubmit={handleSubmit} noValidate>
        <div className="mb-6">
          <label className="field-label" htmlFor="posting-title">Title</label>
          <input
            className="field-input"
            id="posting-title"
            type="text"
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="field-label" htmlFor="posting-description">Description</label>
          <textarea
            className="field-input"
            id="posting-description"
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="field-label" htmlFor="posting-skills">Required skills</label>
          <input
            className="field-input"
            id="posting-skills"
            type="text"
            value={form.requiredSkills}
            onChange={(e) => setField('requiredSkills', e.target.value)}
            required
          />
          <span className="block font-mono text-xs tracking-wide text-ink-soft mt-1.5">
            Comma-separated, e.g. Java, SQL, React
          </span>
        </div>
        <div className="mb-6">
          <label className="field-label" htmlFor="eligibleBranches">Eligible branches (optional)</label>
          <input
            className="field-input"
            id="eligibleBranches"
            type="text"
            value={form.eligibleBranches}
            onChange={(e) => setField('eligibleBranches', e.target.value)}
            placeholder="Comma-separated, e.g. CSE, ECE — leave blank for no restriction"
          />
        </div>
        <div className="mb-6">
          <label className="field-label" htmlFor="minCgpa">Minimum CGPA (optional)</label>
          <input
            className="field-input"
            id="minCgpa"
            type="number"
            step="0.1"
            value={form.minCgpa}
            onChange={(e) => setField('minCgpa', e.target.value)}
            placeholder="e.g. 7.5 — leave blank for no cutoff"
          />
        </div>
        <div className="flex items-center gap-4">
          <button className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed" type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : editingId ? 'Update draft' : 'Save posting'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEditing}
              className="font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-ink transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <h2 className={SECTION_CLASS}>On file</h2>
      <div className="border-t border-rule">
        {loading && <div className="py-12 text-center text-ink-soft font-mono text-sm">Reading the register…</div>}
        {!loading && postings.length === 0 && !error && (
          <div className="py-12 text-center text-ink-soft font-mono text-sm">
            No postings on file yet. Save your first posting above.
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
                <p className="font-mono text-xs tracking-wide uppercase text-ink-soft">
                  Filed {formatTimestamp(p.createdAt)}
                </p>
                {p.status === 'PUBLISHED' ? (
                  <>
                    {p.candidateCount === 0 ? (
                      <p className="font-mono text-xs text-ink-soft mt-2">
                        Not yet scored &mdash; matching happens when a student or you view candidates.
                      </p>
                    ) : (
                      <p className="font-mono text-xs text-ink-soft mt-2">
                        {p.candidateCount} scored &middot; avg {p.avgScore}% &middot; top {p.topScore}%
                      </p>
                    )}
                    {p.topCandidateEmail && (
                      <p className="font-mono text-xs text-sage mt-1">
                        Top match: {p.topCandidateEmail} ({p.topScore}%)
                      </p>
                    )}
                    <Link
                      to={`/recruiter/postings/${p.postingId}/candidates`}
                      className="btn-primary-sm mt-3 inline-block"
                    >
                      View candidates &rarr;
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="font-mono text-xs text-ink-soft mt-2">
                      Awaiting placement cell approval &mdash; candidates unavailable until published.
                    </p>
                    {p.status === 'DRAFT' && (
                      <button
                        onClick={() => startEditing(p)}
                        className="font-mono text-xs uppercase tracking-wide text-brass hover:text-brass-soft transition-colors mt-2"
                      >
                        Edit draft
                      </button>
                    )}
                  </>
                )}
                {(p.eligibleBranches?.length > 0 || p.minCgpa) && (
                  <p className="font-mono text-xs text-brass mt-1">
                    {p.eligibleBranches?.join(', ')}
                    {p.minCgpa ? ` \u00b7 ${p.minCgpa}+ CGPA` : ''}
                  </p>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
