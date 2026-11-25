'use client';

import { useEffect, useRef } from 'react';
import { Camera } from 'lucide-react';
import type { InkFrame, InkLayout } from '@/lib/ink-layouts';
import { drawInkPreset } from '@/lib/ink-render';
import { filters } from '@/lib/strip';
import { cn } from '@/lib/utils';

export const INK_SAMPLE_PHOTO = '/ink-booth.webp';

function PresetArt({ design, layout }: { design: string; layout: InkLayout }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current) drawInkPreset(canvas.current, design, layout);
  }, [design, layout]);
  return <canvas ref={canvas} width={222} height={342} className="absolute inset-0 size-full" />;
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
  return <div aria-hidden="true" className={cn('relative grid aspect-[37/57] w-full overflow-hidden bg-muted', className)}
    style={{ gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))` }}>
    {Array.from({ length: layout.count }, (_, i) => sample ?
      <img key={i} src={INK_SAMPLE_PHOTO} alt="" loading="lazy" className="ink-sample size-full object-cover" style={{ filter: filters[filter] }} /> :
      <span key={i} className="grid place-items-center border border-background text-muted-foreground"><Camera className="opacity-60" /></span>
    )}
    {image ? <img src={image} alt="" loading="lazy" className="absolute inset-0 size-full" /> :
      frame?.kind === 'preset' && <PresetArt design={frame.design} layout={layout} />}
  </div>;
}
