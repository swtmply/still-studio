'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Camera, Check, Printer } from 'lucide-react';
import { InkCamera } from '@/components/ink-camera';
import { InkDesign } from '@/components/ink-design';
import { InkScreenTimer } from '@/components/ink-screen-timer';
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
  const screenVersion = useRef(0);
  const shareRequest = useRef<AbortController | null>(null);
  const frame = frames.find((item) => item.id === frameId && (item.kind === 'preset' || item.layout === layout.id));

  useEffect(() => {
    heading.current?.focus();
    window.scrollTo(0, 0);
  }, [step]);

  useEffect(() => () => {
    printFrame.current?.remove();
    shareRequest.current?.abort();
  }, []);

  function go(next: Step) {
    shareRequest.current?.abort();
    screenVersion.current += 1;
    setError('');
    setStep(next);
    return screenVersion.current;
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

  function start() {
    go('design');
    void loadFrames();
  }

  function reset() {
    printOverlay.current = null;
    setLayout(inkLayouts[0]);
    setFrameId('');
    setFilter('color');
    setShots([]);
    setSelected([]);
    setPrint('');
    setShare(null);
    setBusy(false);
    setPrinting(false);
    go('welcome');
  }

  function pick(index: number) {
    setSelected((current) => {
      if (current.includes(index)) return current.filter((item) => item !== index);
      return current.length < layout.count ? [...current, index] : current;
    });
  }

  async function preview(selection = selected) {
    setSelected(selection);
    setPrint('');
    printOverlay.current = null;
    const version = go('preview');
    try {
      const { image, overlay } = await renderInkPrint(selection.map((index) => shots[index]), layout, filter, frame);
      if (screenVersion.current !== version) return;
      printOverlay.current = overlay;
      setPrint(image);
    } catch {
      if (screenVersion.current === version) setError('Could not build the preview. Go back and try again.');
    }
  }

  function confirm() {
    go('share');
    void publish();
  }

  function advance() {
    switch (step) {
      case 'design': go('camera'); break;
      case 'select': {
        const remaining = shots.map((_, index) => index).filter((index) => !selected.includes(index));
        void preview([...selected, ...remaining].slice(0, layout.count));
        break;
      }
      case 'preview':
        if (print) confirm();
        else reset();
        break;
      case 'share': reset(); break;
    }
  }

  async function publish() {
    const version = screenVersion.current;
    const controller = new AbortController();
    shareRequest.current = controller;
    setBusy(true);
    setError('');
    try {
      const gif = await renderInkGif(selected.map((index) => shots[index]), layout, filter, printOverlay.current);
      controller.signal.throwIfAborted();
      const form = new FormData();
      form.append('gif', gif, 'postcard.gif');
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(60_000)]);
      const response = await fetch('/api/ink/share', { method: 'POST', body: form, signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not create the share link.');
      if (screenVersion.current !== version) return;
      setShare(result);
      setShots([]);
    } catch (error) {
      if (screenVersion.current === version) setError(error instanceof Error && error.name !== 'TypeError' ? error.message : 'Could not create the QR link. Check your internet connection and retry.');
    } finally {
      if (screenVersion.current === version) setBusy(false);
    }
  }

  async function openPrint() {
    const version = screenVersion.current;
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
      if (screenVersion.current === version) setError('Could not open the print dialog. Save the postcard and print it from your device.');
    } finally {
      if (screenVersion.current === version) setPrinting(false);
    }
  }

  return (
    <div className="ink-shell min-h-dvh bg-background text-foreground">
      <header className="ink-nav flex-wrap">
        {step === 'welcome' && <a className="ink-wordmark" href="/">Moments <em>in Ink</em></a>}
        {step !== 'welcome' && <span className="ink-wordmark">Moments <em>in Ink</em></span>}
        {step !== 'welcome' && step !== 'camera' && <InkScreenTimer key={step} onExpire={advance} />}
        {step === 'welcome' && <Button asChild variant="outline"><a href="/dashboard">Dashboard</a></Button>}
      </header>
      <main className="ink-main">
        {step === 'welcome' ? <section className="ink-hero">
          <div className="ink-hero-copy">
            <h1 ref={heading} tabIndex={-1}>Moments<br /><em>in Ink.</em></h1>
            <Button size="lg" className="min-h-12 w-fit" onClick={start}><Camera data-icon="inline-start" />Capture the Moment<ArrowRight data-icon="inline-end" /></Button>
          </div>
          <img className="ink-hero-art" src="/ink-booth.webp" alt="Photobooth prints scattered on crimson fabric beside a vintage flash" />
        </section> : <section className="mx-auto flex w-full max-w-3xl flex-col gap-7">
          {step !== 'camera' && <h1 ref={heading} tabIndex={-1} className="ink-title">{stepTitles[step]}</h1>}
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
          {step === 'camera' && <InkCamera layout={layout} framed={frame?.kind === 'preset'} onTimeout={reset} onBack={() => go('design')} onFinish={(result) => { setShots(result); setSelected([]); go('select'); }} />}
          {step === 'select' && <>
            <p className="m-0 text-muted-foreground" role="status">{selected.length} of {layout.count} selected. Tap in print order. The timer fills any open spots in capture order.</p>
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
              <Button size="lg" disabled={selected.length !== layout.count} onClick={() => preview()}>Preview postcard <ArrowRight data-icon="inline-end" /></Button>
            </div>
          </>}
          {(step === 'preview' || step === 'share') && <div className="ink-review">
            {print ? <img className="ink-postcard" src={print} alt="Your finished Japanese Postcard" /> :
              <p className="m-0 text-muted-foreground" role="status">{error ? 'Preview unavailable.' : 'Preparing your postcard…'}</p>}
            {step === 'preview' ? <div className="flex flex-col gap-4">
              <p className="m-0 text-muted-foreground">100 × 148 mm · Portrait · {layout.label}</p>
              <p className="m-0 text-sm text-muted-foreground">The booth creates your six-hour GIF link when you confirm or the timer ends.</p>
              <Button size="lg" disabled={!print} onClick={confirm}><Check data-icon="inline-start" />Confirm postcard</Button>
              <Button variant="outline" onClick={() => go('select')}>Change photos</Button>
            </div> : <div className="flex flex-col gap-4">
              <Button size="lg" className="min-h-14 w-full" disabled={printing} onClick={openPrint}><Printer data-icon="inline-start" />{printing ? 'Opening print…' : 'Print this moment'}</Button>
              <p className="m-0 text-sm text-muted-foreground">Select Japanese Postcard, 100% scale and no margins. Enable Borderless in the printer preferences.</p>
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
