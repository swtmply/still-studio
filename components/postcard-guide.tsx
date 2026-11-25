import { Camera } from 'lucide-react';
import type { InkLayout } from '@/lib/ink-layouts';

export function PostcardGuide({ layout, overlay }: { layout: InkLayout; overlay?: string }) {
  return <div>
    <div className="ink-guide" role="img" aria-label={`Portrait ${layout.label} grid`} style={{ gridTemplateColumns: `repeat(${layout.columns}, 1fr)`, gridTemplateRows: `repeat(${layout.rows}, 1fr)` }}>
      {Array.from({ length: layout.count }, (_, i) => <span key={i} aria-hidden="true"><Camera /></span>)}
      {overlay && <img src={overlay} alt="" />}
    </div>
    <p className="m-0 mt-3 text-center text-sm text-muted-foreground">3.7 × 5.7 in · Portrait</p>
  </div>;
}
