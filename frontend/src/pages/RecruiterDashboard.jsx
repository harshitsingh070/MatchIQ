import { useEffect, useState } from 'react';
import { createPosting, getJobPostings } from '../api/client.js';
import StatusTag from '../components/StatusTag.jsx';
import { getSession } from '../lib/auth.js';

const EMPTY_FORM = { title: '', description: '', requiredSkills: '' };

const ALERT_CLASS =
  'font-mono text-xs text-brick bg-brick-bg border border-rule border-l-[3px] border-l-brick px-4 py-3 mb-6';

const SECTION_CLASS = 'font-mono text-xs font-semibold tracking-widest uppercase text-ink-soft mt-10 mb-4';

function formatTimestamp(iso) {
  if (!iso) return '';
  return iso.slice(0, 16).replace('T', ' ');
}

export default function RecruiterDashboard() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [postings, setPostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    getJobPostings()
      .then((data) => {
        const { email } = getSession();
        const mine = email ? data.filter((p) => p.recruiter?.email === email) : data;
        setPostings(mine);
      })
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
      await createPosting({
        title: form.title.trim(),
        description: form.description.trim(),
        requiredSkills: form.requiredSkills.trim(),
      });
      setForm(EMPTY_FORM);
      load();
    } catch {
      setError('The posting could not be saved. Check the required fields and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell">
      <p className="eyebrow">Recruiter desk</p>
      <h1 className="font-display text-3xl font-medium mb-2">Your postings</h1>
      <p className="text-ink-soft text-sm mb-10 max-w-md">
        Draft a posting below. The placement cell reviews and publishes it before students can see it.
      </p>

      {error && <div className={ALERT_CLASS}>{error}</div>}

      <h2 className={SECTION_CLASS}>New posting</h2>
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
        <button className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed" type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save posting'}
        </button>
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
              key={p.id}
              className="grid grid-cols-[auto_1fr_auto] items-start gap-5 py-6 border-b border-rule opacity-0 animate-rowIn"
              style={{ animationDelay: `${i * 85}ms` }}
            >
              <StatusTag status={p.status} />
              <div>
                <h3 className="font-display text-lg font-medium mb-1.5">{p.title}</h3>
                <p className="font-mono text-xs tracking-wide uppercase text-ink-soft mt-1.5">
                  Filed {formatTimestamp(p.createdAt)}
                </p>
              </div>
              <div className="shrink-0">
                <span
                  className="inline-block font-mono text-xs font-semibold tracking-widest uppercase text-ink-soft bg-paper-raised border border-rule rounded px-3.5 py-2 opacity-60 cursor-not-allowed"
                  title="Candidate ranking is not available yet"
                >
                  View candidates
                </span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
