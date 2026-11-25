'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Camera, Check, Printer } from 'lucide-react';
import { InkCamera } from '@/components/ink-camera';
import { InkDesign } from '@/components/ink-design';
import { Button } from '@/components/ui/button';
import { inkLayouts, POSTCARD, type InkFrame, type InkLayout } from '@/lib/ink-layouts';
import type { InkShot } from '@/lib/ink-capture';
import { renderInkGif, renderInkPrint, type InkOverlay } from '@/lib/ink-render';
import { printMoment } from '@/lib/print';
import { cn } from '@/lib/utils';

type Step = 'welcome' | 'design' | 'camera' | 'select' | 'preview' | 'share';
type Share = { url: string; qr: string; expiresAt: number };

const stepTitles = {
  design: 'Set the look',
  camera: 'Pose for the camera',
  select: 'Pick your photos',
  preview: 'Preview your postcard',
  share: 'Keep the moment',
};

export function InkBooth() {
  const [step, setStep] = useState<Step>('welcome');
  const [layout, setLayout] = useState<InkLayout>(inkLayouts[0]);
  const [frames, setFrames] = useState<InkFrame[]>([]);
  const [frameId, setFrameId] = useState('');
  const [filter, setFilter] = useState('color');
  const [shots, setShots] = useState<InkShot[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [print, setPrint] = useState('');
  const [share, setShare] = useState<Share | null>(null);
  const [busy, setBusy] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState('');
  const [frameError, setFrameError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const printFrame = useRef<HTMLIFrameElement | null>(null);
  const printOverlay = useRef<InkOverlay>(null);
  const frame = frames.find((item) => item.id === frameId && (item.kind === 'preset' || item.layout === layout.id));

  useEffect(() => {
    heading.current?.focus();
    window.scrollTo(0, 0);
  }, [step]);

  useEffect(() => () => printFrame.current?.remove(), []);

  function go(next: Step) {
    setError('');
    setStep(next);
  }

  async function loadFrames() {
    setFrameError('');
    try {
      const response = await fetch('/api/ink/frames', { cache: 'no-store' });
      if (!response.ok) throw new Error();
      setFrames(await response.json());
    } catch {
      setFrameError('The frame library could not load. You can still use Full bleed.');
    }
  }

  function reset() {
    printFrame.current?.remove();
    printOverlay.current = null;
    setLayout(inkLayouts[0]);
    setFrameId('');
    setFilter('color');
    setShots([]);
    setSelected([]);
    setPrint('');
    setShare(null);
    go('welcome');
  }

  function pick(index: number) {
    setSelected((current) => {
      if (current.includes(index)) return current.filter((item) => item !== index);
      return current.length < layout.count ? [...current, index] : current;
    });
  }

  async function preview() {
    setBusy(true);
    setError('');
    try {
      const { image, overlay } = await renderInkPrint(selected.map((index) => shots[index]), layout, filter, frame);
      printOverlay.current = overlay;
      setPrint(image);
      go('preview');
    } catch {
      setError('Could not build the preview. Make sure your frame is available and try again.');
    } finally { setBusy(false); }
  }

  async function publish() {
    setBusy(true);
    setError('');
    try {
      const gif = await renderInkGif(selected.map((index) => shots[index]), layout, filter, printOverlay.current);
      const form = new FormData();
      form.append('gif', gif, 'postcard.gif');
      const response = await fetch('/api/ink/share', { method: 'POST', body: form, signal: AbortSignal.timeout(60_000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not create the share link.');
      setShare(result);
      setShots([]);
    } catch (error) {
      setError(error instanceof Error && error.name !== 'TypeError' ? error.message : 'Could not create the QR link. Check your internet connection and retry.');
    } finally { setBusy(false); }
  }

  async function openPrint() {
    printFrame.current?.remove();
    const output = document.createElement('iframe');
    output.className = 'photo-print-frame';
    output.title = 'Postcard print';
    output.tabIndex = -1;
    output.setAttribute('aria-hidden', 'true');
    document.body.append(output);
    printFrame.current = output;
    output.contentWindow?.addEventListener('afterprint', () => output.remove(), { once: true });
    setPrinting(true);
    try { await printMoment(output, print, { ...POSTCARD, name: 'Postcard' }); }
    catch {
      output.remove();
      setError('Could not open the print dialog. Save the postcard and print it from your device.');
    } finally { setPrinting(false); }
  }

  return (
    <div className="ink-shell min-h-dvh bg-background text-foreground">
      <header className="ink-nav">
        {step === 'welcome' && <a className="ink-wordmark" href="/">Moments <em>in Ink</em></a>}
        {step !== 'welcome' && <span className="ink-wordmark">Moments <em>in Ink</em></span>}
        {step === 'welcome' && <Button asChild variant="ghost"><a href="/admin/frames">Frame admin</a></Button>}
      </header>
      <main className="ink-main">
        {step === 'welcome' ? <section className="ink-hero">
          <div className="ink-hero-copy">
            <h1 ref={heading} tabIndex={-1}>Moments<br /><em>in Ink.</em></h1>
            <Button size="lg" className="min-h-12 w-fit" onClick={() => { go('design'); void loadFrames(); }}><Camera data-icon="inline-start" />Capture the Moment<ArrowRight data-icon="inline-end" /></Button>
          </div>
          <img className="ink-hero-art" src="/ink-booth.webp" alt="Photobooth prints scattered on crimson fabric beside a vintage flash" />
        </section> : <section className="mx-auto flex w-full max-w-3xl flex-col gap-7">
          <h1 ref={heading} tabIndex={-1} className="ink-title">{stepTitles[step]}</h1>
          {step === 'design' && <>
            <InkDesign layout={layout} frame={frame} frames={frames} filter={filter} frameError={frameError} retryFrames={loadFrames}
              onLayout={(next) => {
                setLayout(next);
                if (frame?.kind === 'upload' && frame.layout !== next.id) setFrameId('');
              }}
              onFrame={setFrameId} onFilter={setFilter} />
            <div className="flex flex-wrap justify-between gap-3">
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button size="lg" onClick={() => go('camera')}>Continue to camera <ArrowRight data-icon="inline-end" /></Button>
            </div>
          </>}
          {step === 'camera' && <InkCamera onBack={() => go('design')} onFinish={(result) => { setShots(result); setSelected([]); go('select'); }} />}
          {step === 'select' && <>
            <p className="m-0 text-muted-foreground" role="status">{selected.length} of {layout.count} selected. Tap in the order you want them printed.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {shots.map(({ photo }, index) => {
                const order = selected.indexOf(index) + 1;
                return <Button type="button" key={index} variant="outline" className={cn('relative h-auto min-w-0 overflow-hidden p-0', order > 0 && 'ring-3 ring-primary')} aria-label={`Photo ${index + 1}`} aria-pressed={order > 0} onClick={() => pick(index)}>
                  <img className="aspect-[3/2] w-full object-cover" src={photo} alt="" />
                  {order > 0 && <span className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-primary text-primary-foreground">{order}</span>}
                </Button>;
              })}
            </div>
            <div className="flex flex-wrap justify-between gap-3">
              <Button variant="outline" disabled={busy} onClick={() => go('camera')}>Retake photos</Button>
              <Button size="lg" disabled={busy || selected.length !== layout.count} onClick={preview}>{busy ? 'Building preview…' : 'Preview postcard'} <ArrowRight data-icon="inline-end" /></Button>
            </div>
          </>}
          {(step === 'preview' || step === 'share') && <div className="ink-review">
            <img className="ink-postcard" src={print} alt="Your finished 3.7 by 5.7 inch portrait postcard" />
            {step === 'preview' ? <div className="flex flex-col gap-4">
              <p className="m-0 text-muted-foreground">3.7 × 5.7 in · Portrait · {layout.label}</p>
              <Button size="lg" onClick={() => { go('share'); void publish(); }}><Check data-icon="inline-start" />Confirm postcard</Button>
              <Button variant="outline" onClick={() => go('select')}>Change photos</Button>
            </div> : <div className="flex flex-col gap-4">
              <Button size="lg" className="min-h-14 w-full" disabled={printing} onClick={openPrint}><Printer data-icon="inline-start" />{printing ? 'Opening print…' : 'Print this moment'}</Button>
              <p className="m-0 text-sm text-muted-foreground">Choose 3.7 × 5.7 in paper, borderless mode and 100% scale. Turn off browser headers and footers if they appear.</p>
              <Button asChild variant="outline"><a href={print} download="moments-in-ink.png">Save postcard</a></Button>
              {share ? <div className="grid justify-items-center gap-2 rounded-lg border border-border bg-white p-4 text-center">
                <img className="size-36" src={share.qr} alt="Scan to open the postcard GIF" />
                <a className="text-sm font-semibold text-primary" href={share.url} target="_blank" rel="noreferrer">Open GIF link</a>
                <p className="m-0 text-sm text-muted-foreground">Expires in six hours.</p>
              </div> : busy ? <p role="status" className="m-0 text-muted-foreground">Making your share link…</p> :
                <Button variant="outline" onClick={publish}>Retry QR link</Button>}
              <Button variant="secondary" disabled={busy || printing} onClick={reset}>Finish and return to welcome</Button>
            </div>}
          </div>}
          {error && <p role="alert" className="m-0 text-destructive">{error}</p>}
        </section>}
      </main>
    </div>
  );
}
