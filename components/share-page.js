'use client';

import { useEffect, useRef, useState } from 'react';
import { compressStrip } from '../lib/compress';
import { useStudio, PageIntro } from './studio-context';
import { Icon } from './icon';

export default function SharePage() {
  const { session, setSession, go, reset, localSharing } = useStudio();
  const [imageUrl, setImageUrl] = useState('');
  const [share, setShare] = useState(null);
  const [status, setStatus] = useState('Preparing your smaller video moments…');
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const request = useRef(null);

  useEffect(() => {
    const url = URL.createObjectURL(session.blob);
    setImageUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [session.blob]);

  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    setFailed(false);
    setShare(null);
    const timeout = setTimeout(() => controller.abort(), 60000);
    async function publish() {
      try {
        if (session.share) {
          const response = await fetch(session.share.statusPath, { signal: controller.signal });
          if (response.ok) { setShare(session.share); setStatus(`Scan to replay your ${session.selected.length} selected moments.`); return; }
        }
        const image = await compressStrip(session.blob);
        controller.signal.throwIfAborted();
        const clips = session.selected.map((index) => session.shots[index].clip);
        if (image.size + clips.reduce((total, clip) => total + clip.size, 0) > 3900000) throw new Error('These moments are too large to share. Your original strip is still available to download.');
        const form = new FormData();
        form.append('strip', image, 'strip.jpg');
        form.append('details', JSON.stringify({ filter: session.filter, createdAt: session.createdAt, photoCount: session.selected.length, layoutId: session.layoutId }));
        for (const clip of clips) form.append('clips', clip, clip.type.startsWith('video/mp4') ? 'moment.mp4' : 'moment.webm');
        setStatus('Saving your selected moments…');
        const response = await fetch('/api/shares', { method: 'POST', body: form, signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not prepare the video link.');
        controller.signal.throwIfAborted();
        setSession((current) => ({ ...current, share: result }));
        setShare(result);
        setStatus(result.local ? 'Join the same Wi-Fi as the booth, then scan to replay your moments.' : `Scan to replay your ${session.selected.length} selected moments. The phone needs an internet connection.`);
      } catch (error) {
        if (request.current !== controller) return;
        if (controller.signal.aborted && !document.contains(document.querySelector('#page-share'))) return;
        setFailed(true);
        setStatus(error instanceof TypeError ? 'Sharing is unavailable while offline. Connect and retry—your moments are safe on this device.' : error?.name === 'AbortError' ? 'Sharing timed out. Reconnect and try again.' : error instanceof Error ? error.message : 'Could not share these moments. Try again.');
      } finally { clearTimeout(timeout); }
    }
    void publish();
    return () => { request.current = null; controller.abort(); clearTimeout(timeout); };
  }, [session.id, session.blob, attempt]);

  return <section id="page-share" className="page">
    <PageIntro eyebrow="A LITTLE MEMORY, TO GO" title={<>That’s <em>a keeper.</em></>}>Your {session.selected.length} photos, and the little moments that made them.</PageIntro>
    <div className="share-layout"><div className="finished-strip">{imageUrl && <img src={imageUrl} alt="Your finished photo print"/>}<a className="outline-button" href={imageUrl} download={`still-${session.id}.png`}><Icon name="download"/>Save photo print</a></div><div className="qr-card"><span className="eyebrow">TAKE THE MOMENT WITH YOU</span><h2>Scan. Smile. <em>Replay.</em></h2>{share ? <img className="qr-image" src={share.qr} alt="Scan to watch your selected three-second videos"/> : !failed ? <div className="qr-placeholder"><Icon name="spark"/><p>Preparing your little moments…</p></div> : null}<p id="share-status" role="status">{status}</p>{share && <a id="share-link" href={share.url} target="_blank" rel="noopener">Open your video moments ↗</a>}{failed && <button className="outline-button" onClick={() => setAttempt((current) => current + 1)}>Try sharing again</button>}<div className="wifi-note"><Icon name="lock"/><span>{share?.local || (!share && localSharing) ? 'No internet needed for local sharing. Keep the booth running and stay on the same Wi-Fi.' : 'Only your selected clips and a smaller print are uploaded. Anyone with this unlisted link can view them.'}</span></div></div></div>
    <div className="page-actions"><button className="text-button" onClick={() => go('style')}>← Change frame or filter</button><button className="primary-button" onClick={reset}>Start a new session <Icon name="camera"/></button></div>
  </section>;
}
