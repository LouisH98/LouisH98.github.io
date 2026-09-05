'use client';
import { useEffect, useRef, useState } from 'react';
/** Low-resolution visual text backed by a semantic accessible label. */
export default function BitmapText({ children, className = '', color = '#fff', centered = false }: { children: string; className?: string; color?: string; centered?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState<{width:number;height:number}>();
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
    if (centered) {
      // Center actual ink rather than the font's asymmetric ascender/descender padding.
      let top=canvas.height, bottom=-1;
      for(let i=3;i<pixels.data.length;i+=4) if(pixels.data[i]) {
        const y=Math.floor(i/4/canvas.width);top=Math.min(top,y);bottom=Math.max(bottom,y);
      }
      if(bottom>=top) {
        const ink=ctx.getImageData(0,top,canvas.width,bottom-top+1);
        canvas.height=ink.height;ctx.putImageData(ink,0,0);
      }
    }
    setDimensions({width:canvas.width/size,height:canvas.height/size});
    };
    void document.fonts.load('22px "Console UI"').then(draw).catch(draw);
    return () => { cancelled = true; };
  }, [children, color, centered]);
  return <span className={`bitmap ${centered ? "bitmap-centered" : ""} ${className}`}>
    <span className={dimensions ? 'sr-only' : 'bitmap-fallback'}>{children}</span>
    <canvas ref={ref} aria-hidden="true" style={{ width: dimensions ? `${dimensions.width}em` : 0, height: dimensions ? `${dimensions.height}em` : 0, display: dimensions ? centered ? 'block' : 'inline-block' : 'none' }} />
  </span>;
}
