'use client';
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { Power } from 'lucide-react';
import { crtLayout, crtPowerFrame } from '@/lib/console/crt';
import { asset } from '@/lib/console/assets';
import { smooth } from '@/lib/console/timeline';

type Props = { fallback: boolean; powerButton: RefObject<HTMLButtonElement | null>; children: ReactNode; powered: boolean; ready: boolean; powerTime: number | null; progress: number; onPower: () => void };
export default function CrtEntrance({ fallback, powerButton, children, powered, ready, powerTime, progress, onPower }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const resize = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    const observer = new ResizeObserver(resize);
    observer.observe(element); resize();
    return () => observer.disconnect();
  }, []);
  const full = progress >= 1;
  const ignition = powerTime === null ? null : crtPowerFrame(powerTime);
  const style = { ...(size ? crtLayout(size.width, size.height, progress) : {}), '--crt-presence': 1 - progress, '--crt-casing-opacity': 1 - smooth((progress - .65) / .35) } as CSSProperties;
  if (!fallback) return <div ref={stage} className="bedroom-stage" data-powered={powered}>
    {children}
    {!powered && <button ref={powerButton} className="bedroom-power" onClick={onPower} disabled={!ready} aria-label="Power on CRT monitor" title="Power on"><span className="bedroom-power-glow" aria-hidden="true"/><span className="bedroom-power-label">Power on</span></button>}
  </div>;
  return <div ref={stage} className="crt-stage" data-power={powered ? 'on' : 'off'} data-fullscreen={full} data-warming={ignition !== null}>
    <div className="crt-set" style={style}>
      <div className="crt-aperture">
        <div className="crt-live" style={ignition ? { transform: `scale(${ignition.width}, ${ignition.height})`, opacity: ignition.opacity } : undefined} inert={!powered || ignition !== null} aria-hidden={!powered || ignition !== null}>{children}</div>
        {!powered && <div className="crt-dark-glass" aria-hidden="true" />}
        <div className="crt-glass" aria-hidden="true" />
      </div>
      <img className="crt-casing" src={asset('textures/crt-casing.png')} alt="" aria-hidden="true" draggable={false} />
      <div className="crt-chin" aria-hidden={powered}>
        <div className="crt-power-group">
          {!powered && <span className="crt-power-label" id="crt-power-hint">POWER</span>}
          <button className="crt-power" type="button" onClick={onPower} disabled={!ready || powered} tabIndex={powered ? -1 : 0} aria-label="Power on TV" aria-describedby={!powered ? 'crt-power-hint' : undefined}>
            <Power aria-hidden="true" /><span className="crt-led" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  </div>;
}
