/** Geometric controller symbols share a fixed center, independent of font metrics. */
export default function ControlIcon({ kind }: { kind:'cross'|'circle'|'triangle' }) {
  return <svg className={`controller ${kind}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    {kind==='cross' ? <path d="m6 6 12 12M18 6 6 18" /> : kind==='circle' ? <circle cx="12" cy="12" r="7" /> : <path d="M12 4 21 20H3Z" />}
  </svg>;
}
