const TONES = {
  high: 'bg-sage border-sage',
  mid: 'bg-brass border-brass',
  low: 'bg-brick border-brick',
};

export default function MatchSeal({ score }) {
  const value = Math.round(Number(score) || 0);
  const tone = value >= 70 ? 'high' : value >= 40 ? 'mid' : 'low';
  return (
    <span
      role="img"
      aria-label={`Match score ${value}`}
      className={`relative inline-flex flex-col items-center justify-center w-[72px] h-[72px] rounded-full text-paper-raised border-[1.5px] animate-sealStamp ${TONES[tone]} shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),inset_0_-4px_6px_rgba(0,0,0,0.3)] before:absolute before:inset-1.5 before:rounded-full before:border before:border-dashed before:border-paper-raised/50`}
    >
      <span className="relative font-mono text-2xl font-semibold leading-none">{value}</span>
      <span className="relative font-mono text-[0.5rem] tracking-[0.18em] uppercase opacity-80 mt-1.5">
        match
      </span>
    </span>
  );
}
