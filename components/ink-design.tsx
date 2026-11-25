'use client';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { INK_SAMPLE_PHOTO, PostcardGuide } from '@/components/postcard-guide';
import { inkLayout, inkLayouts, type InkFrame, type InkLayout } from '@/lib/ink-layouts';
import { filterOptions } from '@/lib/strip';

const tileClass = 'h-auto min-w-0 flex-col gap-2 rounded-lg border border-border bg-background p-2 text-xs whitespace-normal data-[state=on]:border-primary data-[state=on]:bg-accent data-[state=on]:ring-1 data-[state=on]:ring-primary';
const groupClass = 'grid w-full grid-cols-3 items-stretch gap-2 sm:gap-3';

export function InkLayoutChoices({ layout, onLayout, disabled }: {
  layout: InkLayout;
  onLayout: (layout: InkLayout) => void;
  disabled?: boolean;
}) {
  return <ToggleGroup type="single" value={layout.id} spacing={2} aria-label="Layout" disabled={disabled} className={groupClass} onValueChange={(id) => {
    const next = inkLayout(id);
    if (next) onLayout(next);
  }}>
    {inkLayouts.map((item) => <ToggleGroupItem key={item.id} value={item.id} className={tileClass}>
      <PostcardGuide layout={item} className="max-w-24 rounded-sm" />
      {item.label}
    </ToggleGroupItem>)}
  </ToggleGroup>;
}

export function InkDesign({ layout, onLayout, frame, frames, onFrame, filter, onFilter, frameError, retryFrames }: {
  layout: InkLayout;
  onLayout: (layout: InkLayout) => void;
  frame?: InkFrame;
  frames: InkFrame[];
  onFrame: (id: string) => void;
  filter: string;
  onFilter: (id: string) => void;
  frameError: string;
  retryFrames: () => void;
}) {
  const finish = filterOptions.find((item) => item.id === filter);
  return <div className="ink-design ink-design-picker">
    <Tabs defaultValue="layout" className="min-w-0">
      <TabsList aria-label="Postcard settings" className="mb-2 grid w-full grid-cols-3">
        <TabsTrigger value="layout">Layout</TabsTrigger>
        <TabsTrigger value="frame">Frame</TabsTrigger>
        <TabsTrigger value="filter">Filter</TabsTrigger>
      </TabsList>
      <TabsContent value="layout">
        <InkLayoutChoices layout={layout} onLayout={onLayout} />
      </TabsContent>
      <TabsContent value="frame">
        <ToggleGroup type="single" value={frame?.id ?? 'full-bleed'} spacing={2} aria-label="Frame" className={groupClass} onValueChange={(id) => { if (id) onFrame(id); }}>
          <ToggleGroupItem value="full-bleed" className={tileClass}>
            <PostcardGuide layout={layout} sample className="max-w-24 rounded-sm" />
            Full bleed
          </ToggleGroupItem>
          {frames.filter((item) => item.kind === 'preset' || item.layout === layout.id).map((item) => <ToggleGroupItem key={item.id} value={item.id} className={tileClass}>
            <PostcardGuide layout={layout} frame={item} sample className="max-w-24 rounded-sm" />
            <span className="break-words capitalize">{item.name}</span>
          </ToggleGroupItem>)}
        </ToggleGroup>
        {frameError && <div className="mt-3 flex flex-wrap items-center gap-2">
          <p role="status" className="m-0 text-sm text-muted-foreground">{frameError}</p>
          <Button variant="outline" size="sm" onClick={retryFrames}>Try again</Button>
        </div>}
      </TabsContent>
      <TabsContent value="filter">
        <ToggleGroup type="single" value={filter} spacing={2} aria-label="Filter" className={groupClass} onValueChange={(id) => { if (id) onFilter(id); }}>
          {filterOptions.map((item) => <ToggleGroupItem key={item.id} value={item.id} className={tileClass}>
            <img src={INK_SAMPLE_PHOTO} alt="" className="ink-sample aspect-square w-full rounded-sm object-cover" style={{ filter: item.value }} />
            {item.name}
          </ToggleGroupItem>)}
        </ToggleGroup>
      </TabsContent>
    </Tabs>
    <figure className="m-0 mx-auto w-full max-w-52 text-center sm:max-w-60">
      <PostcardGuide layout={layout} frame={frame} filter={filter} sample className="shadow-md" />
      <figcaption className="mt-3 text-sm text-muted-foreground">
        <span className="capitalize">{layout.label} · {frame?.name ?? 'Full bleed'} · {finish?.name}</span>
        <span className="mt-1 block">3.7 × 5.7 in · Sample preview</span>
      </figcaption>
    </figure>
  </div>;
}
