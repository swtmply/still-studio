'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { InkScreenTimer } from '@/components/ink-screen-timer';
import { Button } from '@/components/ui/button';
import { captureInkShot, SHOT_INTERVAL, type InkShot } from '@/lib/ink-capture';

export function InkCamera({ onBack, onFinish, onTimeout, minimumPhotos }: {
  onBack: () => void;
  onFinish: (shots: InkShot[]) => void;
  onTimeout: () => void;
  minimumPhotos: number;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const capture = useRef<AbortController | null>(null);
  const completed = useRef<InkShot[]>([]);
  const [mode, setMode] = useState<'off' | 'opening' | 'ready' | 'shooting'>('off');
  const [count, setCount] = useState(0);
  const [seconds, setSeconds] = useState(SHOT_INTERVAL / 1000);
  const [error, setError] = useState('');

  useEffect(() => () => {
    capture.current?.abort();
    stream.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const shooting = mode === 'shooting';
  useEffect(() => { heading.current?.focus(); }, [shooting]);

  async function openCamera() {
    setMode('opening');
    setError('');
    let camera: MediaStream | undefined;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Open the booth on HTTPS or localhost to use your camera.');
      camera = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } } });
      const element = video.current;
      if (!element) {
        camera.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = camera;
      element.srcObject = camera;
      await element.play();
      setMode('ready');
    } catch (error) {
      camera?.getTracks().forEach((track) => track.stop());
      setMode('off');
      setError(error instanceof Error ? error.message : 'Camera access is unavailable.');
    }
  }

  async function shoot() {
    const element = video.current;
    if (!element) return;
    const controller = new AbortController();
    capture.current = controller;
    setError('');
    setMode('shooting');
    setCount(0);
    const shots: InkShot[] = [];
    completed.current = shots;
    const pause = () => { if (document.hidden) controller.abort(); };
    document.addEventListener('visibilitychange', pause);
    let shotAt = performance.now() + SHOT_INTERVAL;
    let showZeroUntil = 0;
    const update = () => {
      const now = performance.now();
      setSeconds(now < showZeroUntil ? 0 : Math.max(0, Math.ceil((shotAt - now) / 1000)));
    };
    update();
    const clock = setInterval(update, 100);
    try {
      for (let i = 0; i < 8; i++) {
        const deadline = shotAt;
        shots.push(await captureInkShot(element, deadline, controller.signal, () => {
          setCount(i + 1);
          showZeroUntil = performance.now() + 180;
          shotAt = deadline + SHOT_INTERVAL;
          update();
        }));
      }
      controller.signal.throwIfAborted();
      onFinish(shots);
    } catch (error) {
      if (video.current) {
        setError(controller.signal.aborted ? 'Keep the booth visible and start the eight shots again.' : error instanceof Error ? error.message : 'Could not capture the photos.');
        if (controller.signal.aborted) {
          setMode('ready');
        } else {
          stream.current?.getTracks().forEach((track) => track.stop());
          element.srcObject = null;
          setMode('off');
        }
      }
    } finally {
      clearInterval(clock);
      document.removeEventListener('visibilitychange', pause);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 ref={heading} tabIndex={-1} className="ink-title">{shooting ? 'Pose for the camera' : 'Get the camera ready'}</h1>
        <InkScreenTimer key={shooting ? 'capture' : 'camera-setup'} onExpire={() => {
          if (mode === 'ready') {
            void shoot();
            return;
          }
          capture.current?.abort();
          if (shooting && completed.current.length >= minimumPhotos) onFinish(completed.current);
          else onTimeout();
        }} />
      </div>
      <div className="ink-camera relative grid aspect-video overflow-hidden rounded-xl bg-foreground text-primary-foreground">
        <video ref={video} autoPlay muted playsInline className="size-full -scale-x-100 object-contain" />
        {(mode === 'off' || mode === 'opening') && <Camera aria-hidden="true" className="absolute place-self-center opacity-60" />}
        {mode === 'shooting' && <>
          {count > 0 && <span key={count} aria-hidden="true" className="ink-shutter-flash" />}
          <span aria-hidden="true" className="ink-countdown">{count === 8 && seconds !== 0 ? '✓' : seconds}</span>
        </>}
      </div>
      {!shooting && <p className="m-0 text-sm text-muted-foreground">Eight shots, seven seconds apart. Once the camera is enabled, shooting starts when you press Start or when the timer ends.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        {mode === 'shooting' ? <p role="status" className="m-0">Shot {count} of 8</p> :
          <Button type="button" size="lg" disabled={mode === 'opening'} onClick={mode === 'ready' ? shoot : openCamera}>
            {mode === 'ready' ? 'Start eight shots' : mode === 'opening' ? 'Opening camera…' : 'Enable camera'}
          </Button>}
      </div>
      {error && <p role="alert" className="m-0 text-destructive">{error}</p>}
    </div>
  );
}
