import { useEffect, useState } from 'react';
import { getMyResume } from '../api/client.js';

const SECTION_LABELS = {
  skills: 'Skills',
  experience: 'Experience',
  education: 'Education',
  projects: 'Projects',
  other: 'Other',
};

export default function ResumePanel({ refreshKey }) {
  const [resume, setResume] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    setStatus('loading');
    getMyResume()
      .then((data) => {
        setResume(data);
        setStatus('ready');
      })
      .catch((err) => {
        console.error('Failed to load resume:', err);
        setStatus('error');
      });
  }, [refreshKey]);

  if (status === 'loading') {
    return <p className="font-mono text-xs text-ink-soft">Reading file&hellip;</p>;
  }

  if (status === 'error') {
    return (
      <p className="font-mono text-xs text-brick">
        Couldn't load your resume &mdash; try refreshing the page.
      </p>
    );
  }

  if (!resume?.hasResume) {
    return (
      <p className="font-mono text-xs text-ink-soft">
        No resume on file yet. Upload one to see what was extracted.
      </p>
    );
  }

  let sections = {};
  try {
    sections = JSON.parse(resume.parsedSections || '{}');
  } catch {
    sections = {};
  }

  return (
    <div>
      <p className="font-mono text-xs text-ink-soft mb-4">
        On file since {new Date(resume.uploadedAt).toLocaleDateString()}
      </p>

      {Object.keys(sections).length === 0 && (
        <p className="text-sm text-ink-soft">
          Text extracted, but no clear section headers were detected in this PDF.
        </p>
      )}

      {Object.entries(sections).map(([key, value]) => (
        <div key={key} className="mb-5">
          <p className="font-mono text-xs uppercase tracking-wide text-brass mb-1.5">
            {SECTION_LABELS[key] ?? key}
          </p>
          <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-line">
            {value.length > 240 ? value.slice(0, 240) + '…' : value}
          </p>
        </div>
      ))}
    </div>
  );
}
