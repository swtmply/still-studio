'use client';

import { useEffect, useRef } from 'react';
import { Camera } from 'lucide-react';
import { POSTCARD, type InkFrame, type InkLayout } from '@/lib/ink-layouts';
import { drawInkPreset, inkPhotoRects } from '@/lib/ink-render';
import { filters } from '@/lib/strip';
import { cn } from '@/lib/utils';

export const INK_SAMPLE_PHOTO = '/ink-booth.webp';

function PresetArt({ design, layout }: { design: string; layout: InkLayout }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current) drawInkPreset(canvas.current, design, layout);
  }, [design, layout]);
  return <canvas ref={canvas} width={250} height={370} className="absolute inset-0 size-full" />;
}

export function PostcardGuide({ layout, frame, overlay, filter = 'color', sample = false, className }: {
  layout: InkLayout;
  frame?: InkFrame;
  overlay?: string;
  filter?: string;
  sample?: boolean;
  className?: string;
}) {
  const image = overlay || (frame?.kind === 'upload' ? frame.url : undefined);
  const framed = !image && frame?.kind === 'preset';
  return <div aria-hidden="true" className={cn('relative aspect-[25/37] w-full overflow-hidden bg-muted', className)}>
    {inkPhotoRects(layout, framed).map((rect) => <span key={`${rect.x}-${rect.y}`} className="absolute grid place-items-center overflow-hidden"
      style={{
        left: `${100 * rect.x / POSTCARD.width}%`,
        top: `${100 * rect.y / POSTCARD.height}%`,
        width: `${100 * rect.width / POSTCARD.width}%`,
        height: `${100 * rect.height / POSTCARD.height}%`,
      }}>
      {sample ? <img src={INK_SAMPLE_PHOTO} alt="" loading="lazy" className="ink-sample size-full object-cover" style={{ filter: filters[filter] }} /> :
        <span className="grid size-full place-items-center border border-background text-muted-foreground"><Camera className="opacity-60" /></span>}
    </span>)}
    {image ? <img src={image} alt="" loading="lazy" className="absolute inset-0 size-full" /> :
      frame?.kind === 'preset' && <PresetArt design={frame.design} layout={layout} />}
  </div>;
}
