'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import BitmapText from './BitmapText';
import ControlIcon from './ControlIcon';
import Scene from './Scene';
import CrtEntrance from './CrtEntrance';
import { crtZoom, CRT_POWER_DURATION } from '@/lib/console/crt';
import SaveIcon from './SaveIcon';
import ProjectDetail from './ProjectDetail';
import Settings from './Settings';
import { BOOT_DURATION } from '@/lib/console/timeline';
import { Volume2, VolumeX, ArrowUpRight } from 'lucide-react';
import { about, projects } from '@/lib/console/content';
import { parseHash, routeHash, type Route } from '@/lib/console/navigation';
import { ConsoleAudio } from '@/lib/console/audio';

const menu = [{ title: 'Browser', view: 'browser' }, { title: 'About Me', view: 'about' }, { title: 'System Configuration', view: 'settings' }] as const;
export default function Console() {
  const [ready, setReady] = useState(false), [boot, setBoot] = useState(false), [elapsed, setElapsed] = useState(0);
  const [powered, setPowered] = useState(false);
  const powerState = useRef(false);
  const powerButton = useRef<HTMLButtonElement>(null);
  const [changing, setChanging] = useState(false);
  const [settingIndex,setSettingIndex]=useState(0);
  const transition = useRef<ReturnType<typeof setTimeout> | null>(null);
  const motionState = useRef(false);
  const [route, setRoute] = useState<Route>({ view: 'menu' });
  const [selected, setSelected] = useState(0), [save, setSave] = useState(0);
  const [reduced, setReduced] = useState(false), [failed, setFailed] = useState(false);
  const [sound, setSound] = useState(true), [soundLoading, setSoundLoading] = useState(false), [audioError, setAudioError] = useState('');
  const [audioReady, setAudioReady] = useState(false), [optionsOpen, setOptionsOpen] = useState(false);
  const soundWanted = useRef(true), audioUnlocked = useRef(false), audioUnlocking = useRef(false);
  const root = useRef<HTMLElement>(null), audio = useRef<ConsoleAudio | null>(null);
  const currentFrame = useRef({ boot, elapsed }); currentFrame.current = { boot, elapsed };
  const currentRoute = useRef(route); currentRoute.current = route;
  const focusByView = useRef<Record<string, string>>({}), reducedOverride = useRef(false);
  motionState.current = reduced;
  const finish = useCallback(() => { setBoot(false); }, []);

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(media.matches); setRoute(parseHash(location.hash));
    audio.current = new ConsoleAudio(() => currentFrame.current, setAudioError);
    setReady(true);
    const unlock = (event?: Event) => {
      if (!powerState.current || !soundWanted.current || audioUnlocked.current || audioUnlocking.current) return;
      if (event?.target instanceof Element && event.target.closest('[data-sound-toggle], [data-dev-controls]')) return;
      audioUnlocking.current = true;
      void audio.current?.enable(!event).then(enabled => {
        audioUnlocking.current = false;
        if (!soundWanted.current) return;
        audioUnlocked.current = enabled; setAudioReady(enabled);
      });
    };
    addEventListener('pointerdown', unlock); addEventListener('keydown', unlock);
    const hash = () => {
      const active = document.activeElement;
      if (active?.id) focusByView.current[currentRoute.current.view] = active.id;
      if (transition.current) clearTimeout(transition.current);
      const next = parseHash(location.hash);
      setOptionsOpen(false); setChanging(true); finish();
      transition.current = setTimeout(() => { setRoute(next); setChanging(false); }, motionState.current ? 0 : 420);
    };
    const motion = () => { if (!reducedOverride.current) { setReduced(media.matches); if (media.matches) finish(); } };
    const visibility = () => audio.current?.visibility();
    addEventListener('hashchange', hash); media.addEventListener('change', motion); document.addEventListener('visibilitychange', visibility);
    return () => { removeEventListener('pointerdown', unlock); removeEventListener('keydown', unlock); if (transition.current) clearTimeout(transition.current); removeEventListener('hashchange', hash); media.removeEventListener('change', motion); document.removeEventListener('visibilitychange', visibility); audio.current?.dispose(); audio.current = null; };
  }, [finish]);

  useEffect(() => {
    if (!ready || !boot) return;
    let previous = performance.now(), time = currentFrame.current.elapsed;
    let id = 0;
    const tick = (now: number) => { const wasWarming = time < 0; if (!document.hidden) time += (now - previous) / 1000; previous = now;
      currentFrame.current = { boot: true, elapsed: time };
      setElapsed(time);
      if (wasWarming && time >= 0) audio.current?.sync(true);
      if (time >= BOOT_DURATION) finish();
      else id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    const visibility = () => { previous = performance.now(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { cancelAnimationFrame(id); document.removeEventListener('visibilitychange', visibility); };
  }, [ready, boot, finish]);
  useEffect(() => { audio.current?.sync(); }, [boot]);
  useEffect(() => {
    if (!ready || !powered || boot) return;
    const frame = requestAnimationFrame(() => {
      const remembered = focusByView.current[route.view];
      const target = (remembered ? document.getElementById(remembered) : null) || root.current?.querySelector<HTMLElement>(route.view === 'menu' ? '#menu-browser' : route.view === 'browser' ? `#save-${projects[0].id}` : '[data-screen-heading]');
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, powered, boot, route]);

  useEffect(() => {
    if (optionsOpen) root.current?.querySelector<HTMLElement>('.save-options a')?.focus();
  }, [optionsOpen]);
  function closeOptions() { setOptionsOpen(false); document.getElementById(`save-${projects[save].id}`)?.focus(); }
  function remember() { if (document.activeElement?.id) focusByView.current[route.view] = document.activeElement.id; }
  function navigate(next: Route, cue: 'enter' | 'back' | 'save' = 'enter') { remember(); audio.current?.cue(cue); location.hash = routeHash(next); }
  const goBack = useCallback(() => {
    if (boot) { finish(); return; }
    if (route.view === 'menu') return;
    const next: Route = { view: route.view === 'project' ? 'browser' : 'menu' };
    audio.current?.cue('back'); location.hash = routeHash(next);
  }, [boot, route.view, finish]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest('[data-dev-controls]')) return;
      if (!powerState.current || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Escape') { event.preventDefault(); if (optionsOpen) { setOptionsOpen(false); document.getElementById(`save-${projects[save].id}`)?.focus(); } else goBack(); return; }
      if (boot) return;
      const target = event.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        // Leave arrows available for reading long project descriptions.
        if (route.view === 'settings' || route.view === 'project' || route.view === 'about') return;
        const items = [...(root.current?.querySelectorAll<HTMLElement>(optionsOpen ? '.save-options [data-nav-item]' : '[data-nav-group] [data-nav-item]') || [])];
        if (!items.length) return;
        event.preventDefault();
        let index = items.indexOf(document.activeElement as HTMLElement);
        if (event.key === 'Home') index = 0;
        else if (event.key === 'End') index = items.length - 1;
        else index = (index + (['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 1) + items.length) % items.length;
        items[index].focus();
      }
    };
    addEventListener('keydown', onKey); return () => removeEventListener('keydown', onKey);
  }, [boot, route.view, goBack, optionsOpen, save]);
  function powerOn() {
    if (!ready || powerState.current) return;
    powerState.current = true;
    const intro = parseHash(location.hash).view === 'menu' && !reduced && !failed;
    const start = intro ? -CRT_POWER_DURATION : 0;
    setElapsed(start); currentFrame.current = { boot: intro, elapsed: start };
    setBoot(intro); setPowered(true);
    if (soundWanted.current) {
      audioUnlocking.current = true;
      void audio.current?.enable().then(enabled => {
        audioUnlocking.current = false;
        if (!soundWanted.current) return;
        audioUnlocked.current = Boolean(enabled); setAudioReady(Boolean(enabled));
      });
    }
  }
  const warming = boot && elapsed < 0;
  useEffect(() => {
    if (powered && boot && !warming) root.current?.querySelector<HTMLButtonElement>('.boot-bottom button')?.focus({ preventScroll: true });
  }, [powered, boot, warming]);
  async function toggleSound() {
    setAudioError('');
    const wanted = !soundWanted.current;
    soundWanted.current = wanted; setSound(wanted);
    if (!wanted) { audio.current?.disable(); audioUnlocked.current = false; setAudioReady(false); setSoundLoading(false); return; }
    setSoundLoading(true);
    const enabled = await audio.current?.enable();
    if (soundWanted.current) { audioUnlocked.current = Boolean(enabled); setAudioReady(Boolean(enabled)); }
    setSoundLoading(false);
  }
  function replay() {
    if (reduced || failed) return;
    if (transition.current) clearTimeout(transition.current); setChanging(false);
    remember(); history.replaceState(null, '', `${location.pathname}${location.search}#/`); setRoute({ view: 'menu' });
    setElapsed(-CRT_POWER_DURATION); currentFrame.current = { boot: true, elapsed: -CRT_POWER_DURATION }; setBoot(true); audio.current?.sync(true);
  }
  function selection(index: number, kind: 'menu' | 'save') {
    if (kind === 'menu') { if (selected !== index) audio.current?.cue(route.view === 'settings' ? 'setting' : 'move'); setSelected(index); }
    else { if (save !== index) audio.current?.cue('move'); setSave(index); }
  }
  const project = projects.find(p => p.id === route.projectId) || projects[0];
  const title = route.view === 'browser' ? 'Browser' : route.view === 'about' ? 'About Me' : route.view === 'settings' ? 'System Configuration' : 'Memory Card (PS2) / 1';
  return <CrtEntrance fallback={failed} powerButton={powerButton} powered={powered} ready={ready} powerTime={warming ? elapsed + CRT_POWER_DURATION : null} progress={powered ? boot ? crtZoom(elapsed) : 1 : 0} onPower={powerOn}><main ref={root} data-powered={powered} data-room={!powered || (boot && crtZoom(elapsed)<1)} data-ready={ready} data-view={!ready ? 'initializing' : boot ? 'boot' : route.view} data-motion={reduced ? 'reduced' : 'full'} data-audio={sound ? audioReady ? 'on' : 'pending' : 'off'} className={`console ${boot ? 'is-booting' : ''} ${failed ? 'scene-failed' : ''} view-${route.view}`}>
    <h1 className="sr-only">Louis’s portfolio</h1>
    <div className="screen-haze" aria-hidden="true" />
    {ready && !failed && <Scene powered={powered} powerButton={powerButton} settingIndex={settingIndex} boot={boot} elapsed={elapsed} reduced={reduced} view={route.view} onFailure={() => { setFailed(true); finish(); }} />}
    <div className="transition-black" style={{ opacity: !reduced && !boot && changing ? 1 : 0 }} aria-hidden="true" />
    <header className="console-top"><button id="sound-control" data-sound-toggle className="sound-button" onClick={toggleSound} aria-pressed={sound} aria-busy={soundLoading} aria-label={sound ? 'Mute sound' : 'Enable sound'} title={sound ? 'Mute sound' : 'Enable sound'}>{sound ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}</button></header>
    {audioError && <output className="audio-status">{audioError}</output>}
    {boot ? <>
      <output className="sr-only">Louis Computer Entertainment. Starting up.</output>
      <div className="boot-bottom"><button onClick={finish} aria-label="Skip intro"><span>Skip intro</span><ControlIcon kind="cross" /></button></div>
    </> : <div key={`${route.view}-${route.projectId || ""}`} className={`screen-content ${changing ? "is-changing" : ""}`}>
      {route.view === 'menu' ? <>
        <nav className="main-menu" aria-label="Main menu" data-nav-group>{menu.map((item, i) => <a id={`menu-${item.view}`} data-nav-item key={item.title} href={routeHash({view:item.view})} className={`menu-item ${selected === i ? 'selected' : ''}`} onClick={() => { remember(); audio.current?.cue('enter'); }} onFocus={() => selection(i, 'menu')} onMouseEnter={() => selection(i, 'menu')}><BitmapText>{item.title}</BitmapText></a>)}</nav>

      </> : <>
        {route.view !== 'browser' && route.view !== 'settings' && <div className="screen-title"><h2><BitmapText>{title}</BitmapText></h2></div>}
        {route.view === 'browser' && <section className="save-browser" aria-label="Memory card saves">
          <h2 className="memory-label"><BitmapText>Memory Card (PS2)/1</BitmapText></h2>
          <h3 className="selected-save-title" aria-live="polite"><BitmapText color="#e8ed81">{projects[save].title}</BitmapText></h3>
          <div className="save-grid" data-nav-group>{projects.map((p, i) => <a id={`save-${p.id}`} data-nav-item aria-label={p.title} key={p.id} href={routeHash({ view:'project',projectId:p.id })} className={`save-item ${save===i ? 'selected' : ''}`} onClick={() => { remember(); audio.current?.cue('save'); }} onFocus={() => selection(i,'save')} onMouseEnter={() => selection(i,'save')}>
            <SaveIcon kind={p.id} active={save===i} reduced={reduced} image={p.image} />
            <h3 className="save-title"><BitmapText color={save===i ? "#e8ed81" : "#ffffff"}>{p.title}</BitmapText></h3>
          </a>)}</div>
          {optionsOpen && <nav className="save-options" aria-label="Save options">
            <a data-nav-item href={routeHash({view:'project',projectId:projects[save].id})} onClick={() => audio.current?.cue('save')}>View project</a>
            <a data-nav-item href={projects[save].url} target="_blank" rel="noreferrer" onClick={closeOptions}>{projects[save].linkLabel}<span className="sr-only"> (opens in a new tab)</span></a>
            <button data-nav-item onClick={closeOptions}>Cancel</button>
          </nav>}
        </section>}
        {route.view === 'about' && <section className="about-panel scroll-panel">
          <h1 tabIndex={-1} data-screen-heading><BitmapText>{about.intro}</BitmapText></h1>
          {about.paragraphs.map(p=><p key={p}>{p}</p>)}
          <a id="github-profile" className="launch-link" href={about.url} target="_blank" rel="noreferrer">Find me on GitHub<ArrowUpRight className="action-icon" aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span></a>
        </section>}
        {route.view === 'settings' && <Settings index={settingIndex} setIndex={setSettingIndex} sound={sound} reduced={reduced} failed={failed} toggleSound={toggleSound} toggleMotion={() => { reducedOverride.current=true; setReduced(value=>!value); audio.current?.cue('enter'); }} replay={replay} cue={() => audio.current?.cue('setting')} />}
        {route.view === 'project' && <ProjectDetail key={project.id} project={project} reduced={reduced} />}
      </>}
      <footer className="console-footer">
        {(route.view==='menu'||route.view==='browser'||route.view==='settings') && <button className="footer-button footer-enter" onClick={() => route.view==='settings' ? document.getElementById('configuration-value')?.click() : route.view==='menu' ? navigate({view:menu[selected].view}) : navigate({view:'project',projectId:projects[save].id}, 'save')}><ControlIcon kind="cross" /><BitmapText centered>Enter</BitmapText></button>}
        {route.view !== 'menu' && <button className="footer-button footer-back" onClick={goBack} aria-label="Back"><ControlIcon kind="circle" /><BitmapText centered>Back</BitmapText></button>}
        {route.view === 'browser' && <button className="footer-button footer-options" aria-expanded={optionsOpen} onClick={() => { audio.current?.cue('enter'); setOptionsOpen(value=>!value); }}><ControlIcon kind="triangle" /><BitmapText centered>Options</BitmapText></button>}
      </footer>
    </div>}
    <noscript><div className="noscript-portfolio"><h1>Hey! I’m Louis.</h1><p>Creative coding, hardware experiments, and 3D printing.</p><ul>{projects.map(p=><li key={p.id}><a href={p.url}>{p.title}</a><p>{p.summary}</p></li>)}</ul><a href={about.url}>Find me on GitHub</a></div></noscript>
  </main></CrtEntrance>;
}
