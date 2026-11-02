'use client';

import { useEffect, useRef, useState } from 'react';
import { captureShot, delay } from '../lib/media';
import { saveDraft } from '../lib/storage';
import { useStudio, PageIntro } from './studio-context';
import { Icon } from './icon';

export default function CapturePage() {
  const { session, setSession, setMessage, go } = useStudio();
  const video = useRef(null);
  const stream = useRef(null);
  const controller = useRef(null);
  const mounted = useRef(true);
  const [ready, setReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [shooting, setShooting] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [recording, setRecording] = useState(false);
  const [flash, setFlash] = useState(false);
  const [hint, setHint] = useState('A countdown before each shot. A three-second moment with every photo.');

  function stopCamera() {
    for (const track of stream.current?.getTracks() || []) track.stop();
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    if (mounted.current) setReady(false);
  }
  useEffect(() => {
    mounted.current = true;
    const pause = () => { if (document.hidden) controller.current?.abort(); };
    const leave = () => { controller.current?.abort(); stopCamera(); };
    document.addEventListener('visibilitychange', pause);
    window.addEventListener('pagehide', leave);
    return () => {
      mounted.current = false;
      controller.current?.abort();
      stopCamera();
      document.removeEventListener('visibilitychange', pause);
      window.removeEventListener('pagehide', leave);
    };
  }, []);

  async function enable() {
    if (connecting) return;
    setConnecting(true);
    setMessage('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Open the booth on localhost or HTTPS and allow camera access.');
      if (!globalThis.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw new Error('Use a current browser that supports video recording.');
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1280 } }, audio: false });
      if (!mounted.current) { next.getTracks().forEach((track) => track.stop()); return; }
      stream.current = next;
      video.current.srcObject = next;
      await video.current.play();
      if (!video.current.videoWidth) throw new Error('The camera is not ready. Please try again.');
      setReady(true);
      for (const track of next.getVideoTracks()) track.addEventListener('ended', () => {
        controller.current?.abort(); stopCamera(); setMessage('The camera disconnected. Reconnect it and enable the camera to continue.');
      }, { once: true });
    } catch (error) {
      stopCamera();
      const errors = { NotAllowedError: 'Camera access is blocked. Allow it in your browser’s site settings, then try again.', NotFoundError: 'No camera found. Connect a webcam and try again.', NotReadableError: 'The camera is busy. Close other apps using it and try again.' };
      setMessage(errors[error?.name] || (error instanceof Error ? error.message : 'Could not start the camera.'));
    } finally { if (mounted.current) setConnecting(false); }
  }

  async function shoot() {
    if (controller.current) { controller.current.abort(); return; }
    if (!ready || session.shots.length >= session.total) return;
    const capture = new AbortController();
    controller.current = capture;
    setShooting(true);
    setMessage('');
    let draft = session;
    try {
      while (draft.shots.length < draft.total) {
        for (let count = 3; count > 0; count--) { setCountdown(count); await delay(1000, capture.signal); }
        setCountdown(null);
        setRecording(true);
        const shot = await captureShot(video.current, capture.signal, () => { setFlash(true); setTimeout(() => mounted.current && setFlash(false), 300); });
        capture.signal.throwIfAborted();
        draft = { ...draft, shots: [...draft.shots, shot], blob: undefined, share: undefined };
        setSession(draft);
        setRecording(false);
        await saveDraft(draft).catch(() => setMessage('Keep this page open: this browser could not save your shots locally.'));
        await delay(400, capture.signal);
      }
      go('select', { shots: draft.shots });
    } catch (error) {
      if (!mounted.current) return;
      if (error instanceof Error && error.name === 'AbortError') setHint('Paused. Your completed shots are safe. Continue when you’re ready.');
      else setMessage(error instanceof Error ? error.message : 'This shot could not finish. Try again.');
    } finally {
      controller.current = null;
      if (mounted.current) { setShooting(false); setCountdown(null); setRecording(false); }
    }
  }

  return <section id="page-shoot" className="page">
    <PageIntro eyebrow="FIRST, JUST BE YOU" title={<>A few poses. <em>A little you.</em></>}>No need to get it perfect. You’ll choose your favorites next.</PageIntro>
    <div className="capture-layout"><div className="camera-panel">
      <div className="camera-heading"><span>YOUR MOMENT</span><span>{shooting ? `Shot ${Math.min(session.shots.length + 1, session.total)} of ${session.total}` : ready ? 'Camera ready' : 'Camera off'}</span></div>
      <div className={`viewfinder${ready ? ' active' : ''}`}><video ref={video} autoPlay muted playsInline aria-label="Live camera view"/><div className="finder-corners" aria-hidden="true"><i/><i/><i/><i/></div>
        {!ready && <div className="camera-welcome"><div className="camera-illustration"><Icon name="camera"/><span>✦</span></div><p>Hello, you.</p><span>Get comfortable. Make a little memory.</span><button className="primary-button" onClick={enable} disabled={connecting}><Icon name="camera"/>{connecting ? 'Connecting…' : 'Enable camera'}</button><small>Camera only. Your photos stay here until you share.</small></div>}
        {countdown !== null && <div className="countdown" aria-live="assertive">{countdown}</div>}
        {recording && <div className="recording-label" role="status"><i/>Hold that pose · 3-second clip</div>}
        <div className={`flash${flash ? ' firing' : ''}`} aria-hidden="true"/><span className="viewfinder-label">STILL STUDIO / LIVE VIEW</span>
      </div>
      <div className="capture-toolbar"><div className="shot-progress" aria-label={`${session.shots.length} of ${session.total} shots taken`}>{Array.from({ length: session.total }, (_, index) => <span key={index} className={`shot-dot${index < session.shots.length ? ' done' : ''}`}/>)}<span id="shot-label">{session.shots.length} / {session.total} shots</span></div><button className="primary-button" onClick={shoot} disabled={!ready || session.shots.length >= session.total}><Icon name="camera"/>{shooting ? 'Pause shooting' : session.shots.length ? 'Continue shooting' : 'Start shooting'}</button></div>
      <p className="camera-hint">{hint}</p>{session.shots.length >= 4 && !shooting && <button className="text-button" onClick={() => go('select')}>Choose from your shots <Icon name="arrow"/></button>}
    </div><aside className="capture-note"><span className="note-star">✳</span><h2>More moments.<br/>Less overthinking.</h2><p>Take up to six shots.<br/>Keep your favorite four.</p><fieldset disabled={shooting}><legend>How many shots?</legend><div className="segmented">{[4, 5, 6].map((total) => <button key={total} aria-pressed={session.total === total} className={session.total === total ? 'selected' : ''} disabled={total < session.shots.length} onClick={() => setSession({ ...session, total })}>{total}</button>)}</div></fieldset><div className="note-rule"/><p className="handwritten">Laugh. Move a little.<br/>That’s the good stuff.</p><small>Your captured photos stay a surprise until the next step.</small></aside></div>
  </section>;
}
