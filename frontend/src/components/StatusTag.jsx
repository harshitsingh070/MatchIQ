const STYLES = {
  draft: 'text-ink-soft bg-paper-raised border border-rule',
  approved: 'text-brass bg-paper-raised border border-rule border-l-[3px] border-l-brass',
  published: 'text-sage bg-sage-bg border border-sage-bg',
};

export default function StatusTag({ status }) {
  const key = String(status || 'unknown').toLowerCase();
  return (
    <span
      className={`inline-block shrink-0 font-mono text-[0.66rem] font-semibold tracking-widest uppercase whitespace-nowrap rounded-sm px-2 py-1 ${STYLES[key] || STYLES.draft}`}
    >
      {status}
    </span>
  );
}
