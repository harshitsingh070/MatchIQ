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
  const [showFull, setShowFull] = useState(false);

  useEffect(() => {
    setShowFull(false);
    setStatus('loading');
    getMyResume()
      .then((data) => {
        setResume(data);
        setStatus('ready');
      })
      .catch((err) => {
        console.error(err);
        setStatus('error');
      });
  }, [refreshKey]);

  if (status === 'error') {
    return <p className="font-mono text-xs text-brick">Couldn't load your resume — try refreshing.</p>;
  }
  if (status === 'loading') {
    return <p className="font-mono text-xs text-ink-soft">Reading file&hellip;</p>;
  }
  if (!resume?.hasResume) {
    return <p className="font-mono text-xs text-ink-soft">No resume on file yet. Upload one to see what was extracted.</p>;
  }

  let sections = {};
  try {
    sections = JSON.parse(resume.parsedSections || '{}');
  } catch {
    sections = {};
  }

  const skillsText = typeof sections.skills === 'string' ? sections.skills : '';
  const skillCount = skillsText.split(',').filter((s) => s.trim().length > 0).length;

  const expectedSections = ['skills', 'experience', 'education'];
  const missingSections = expectedSections.filter((s) => !sections[s]);

  return (
    <div>
      <p className="font-mono text-xs text-ink-soft mb-1 truncate">{resume.fileName || 'resume.pdf'}</p>
      <p className="font-mono text-xs text-ink-soft mb-5">
        On file since {new Date(resume.uploadedAt).toLocaleDateString()}
      </p>

      <div className="flex gap-4 mb-5 pb-5 border-b border-rule">
        <div>
          <p className="font-mono text-lg text-ink">{skillCount}</p>
          <p className="font-mono text-[0.6rem] uppercase text-ink-soft">Skills</p>
        </div>
        <div>
          <p className="font-mono text-lg text-ink">{Object.keys(sections).length}</p>
          <p className="font-mono text-[0.6rem] uppercase text-ink-soft">Sections found</p>
        </div>
      </div>

      {missingSections.length > 0 && (
        <div className="mb-5 p-3 border border-brick/30 bg-brick-bg">
          <p className="font-mono text-xs text-brick">
            No {missingSections.join('/')} section detected. Resumes with clear section headers score more reliably.
          </p>
        </div>
      )}

      {Object.keys(sections).length === 0 && (
        <p className="text-sm text-ink-soft">
          Text extracted, but no clear section headers were detected.
        </p>
      )}

      {Object.entries(sections).map(([key, value]) => (
        <div key={key} className="mb-5 pb-5 border-b border-rule last:border-b-0">
          <p className="font-mono text-[0.65rem] uppercase tracking-wide text-brass mb-2">
            {SECTION_LABELS[key] ?? key}
          </p>
          {key === 'other' ? (
            /* Contact info is messier extracted text - smaller and tighter */
            <p className="text-xs text-ink-soft leading-relaxed whitespace-pre-line">{value}</p>
          ) : (
            <ul className="space-y-1.5">
              {value
                .split('\n')
                .filter((line) => line.trim().length > 0)
                .slice(0, 8) // cap displayed lines per section so the panel doesn't grow unbounded
                .map((line, i) => (
                  <li key={i} className="text-sm text-ink-soft leading-snug">
                    {line.trim()}
                  </li>
                ))}
            </ul>
          )}
        </div>
      ))}

      <button
        onClick={() => setShowFull(!showFull)}
        className="font-mono text-xs text-brass hover:text-brass-soft mt-2"
      >
        {showFull ? 'Hide' : 'View'} full extracted text &rarr;
      </button>

      {showFull && (
        <p className="text-xs text-ink-soft mt-3 whitespace-pre-line leading-relaxed">
          {resume.rawText}
        </p>
      )}
    </div>
  );
}
