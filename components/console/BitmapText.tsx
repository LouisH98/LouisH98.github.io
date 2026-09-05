'use client';
import { useEffect, useRef, useState } from 'react';
/** Low-resolution visual text backed by a semantic accessible label. */
export default function BitmapText({ children, className = '', color = '#fff' }: { children: string; className?: string; color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState<number>();
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let cancelled = false;
    const draw = () => {
    if (cancelled) return;
    const size = 22;
    ctx.font = `${size}px "Console UI", Arial, sans-serif`;
    const glyphs = Array.from(new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(children), x => x.segment);
    const widths = glyphs.map(c => ctx.measureText(c).width + .45);
    canvas.width = Math.ceil(widths.reduce((a, b) => a + b, 0)) + 4;
    canvas.height = 31;
    ctx.font = `${size}px "Console UI", Arial, sans-serif`;
    ctx.fillStyle = color; ctx.textBaseline = 'alphabetic';
    let x = 2;
    glyphs.forEach((c, i) => { ctx.fillText(c, x, 23); x += widths[i]; });
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 3; i < pixels.data.length; i += 4) pixels.data[i] = Math.round(pixels.data[i] / 51) * 51;
    ctx.putImageData(pixels, 0, 0);
    setWidth(canvas.width / size);
    };
    void document.fonts.load('22px "Console UI"').then(draw).catch(draw);
    return () => { cancelled = true; };
  }, [children, color]);
  return <span className={`bitmap ${className}`}>
    <span className={width ? 'sr-only' : 'bitmap-fallback'}>{children}</span>
    <canvas ref={ref} aria-hidden="true" style={{ width: width ? `${width}em` : 0, height: '1.4091em', display: width ? 'inline-block' : 'none' }} />
  </span>;
}
