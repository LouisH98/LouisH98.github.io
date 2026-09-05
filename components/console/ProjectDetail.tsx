'use client';
import { useEffect, useRef, useState } from 'react';
import { asset } from '@/lib/console/assets';
import type { Project } from '@/lib/console/content';
import BitmapText from './BitmapText';
import { ArrowUpRight } from 'lucide-react';
function Media({ src, alt, reduced }: { src: string; alt: string; reduced: boolean }) {
  const [failed, setFailed] = useState(false), [play, setPlay] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const animated = /\.mp4$/i.test(src), showVideo = animated && (!reduced || play);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    let visible = false;
    const update = () => {
      if (visible && !document.hidden) void element.play().catch(() => {});
      else element.pause();
    };
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); });
    observer.observe(element); document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); element.pause(); };
  }, [showVideo]);
  if (failed) return <p className="media-error">Image unavailable: {alt}</p>;
  const poster = animated ? src.replace(/\.mp4$/i, '.png') : src;
  return <figure className={`project-media ${src.includes('the-screen') ? 'pixel-media' : ''}`}>
    {showVideo ? <video ref={video} src={asset(src)} poster={asset(poster)} muted loop playsInline preload="none" aria-label={alt} onError={() => setFailed(true)} /> : <img src={asset(poster)} alt={alt} loading="lazy" onError={() => setFailed(true)} />}
    {animated && reduced && <button className="text-action" onClick={() => setPlay(!play)}>{play ? 'Pause animation' : 'Play animation'}</button>}
    <figcaption>{alt}</figcaption>
  </figure>;
}
export default function ProjectDetail({ project, reduced }: { project: Project; reduced: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { ref.current?.scrollTo(0,0); }, [project.id]);
  return <article className="project-detail scroll-panel" ref={ref} aria-label={project.title}>
    <div className="project-intro"><div className="eyebrow">{project.category}</div>
      <h1 tabIndex={-1} data-screen-heading><BitmapText>{project.title}</BitmapText></h1>
      <p className="project-summary">{project.summary}</p>
      <div className="technology-list">{project.technologies.map(t=><span key={t}>{t}</span>)}</div>
      <a className="launch-link" href={project.url} target="_blank" rel="noreferrer">{project.linkLabel}<ArrowUpRight className="action-icon" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
    </div>
    <Media src={project.image} alt={`${project.title} in action`} reduced={reduced} />
    <div className="project-story">{project.sections.map(section=><section key={section.title}>
      <h2>{section.title}</h2>{section.paragraphs.map(p=><p key={p}>{p}</p>)}
      {section.bullets && <ul>{section.bullets.map(b=><li key={b}>{b}</li>)}</ul>}
      {section.image && <Media src={section.image} alt={section.caption || section.title} reduced={reduced} />}
    </section>)}</div>
    <a className="launch-link bottom-launch" href={project.url} target="_blank" rel="noreferrer">{project.linkLabel}<ArrowUpRight className="action-icon" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
  </article>;
}
