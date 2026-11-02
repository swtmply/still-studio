'use client';

import { useEffect, useRef, useState } from 'react';
import { filters } from '../lib/strip';

export default function Viewer({ token }) {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState('Loading your moments…');
  const videos = useRef([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/shares/${token}`, { signal: controller.signal }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'This session could not be loaded.');
      setSession(result);
      setStatus('Tap play on a moment to bring it back.');
    }).catch((error) => { if (!controller.signal.aborted) setStatus(error instanceof Error ? error.message : 'Could not load your moments. Check your connection.'); });
    return () => controller.abort();
  }, [token]);
  return <div className="viewer"><header className="site-header"><span className="brand">still<span className="brand-period">.</span><small>STUDIO</small></span><span className="eyebrow">A MOMENT TO KEEP</span></header><main><div className="page-intro"><p className="eyebrow">A LITTLE MEMORY, IN MOTION</p><h1>{session ? ({ 4: 'Four', 6: 'Six', 8: 'Eight' }[session.clips.length] || 'Your') : 'Your'} little <em>moments.</em></h1><p>The smiles. The in-between. Three seconds of you, with every photo.</p></div><p className="camera-hint" role="status">{status}</p>{session && <><div className="moments">{session.clips.map((source, index) => <article key={source}><video ref={(node) => { videos.current[index] = node; }} src={source} controls muted loop playsInline preload="metadata" style={{ filter: filters[session.filter] }} aria-label={`Play your video moment ${index + 1}`} onPlay={() => videos.current.forEach((video, other) => { if (other !== index) video?.pause(); })} onError={() => setStatus('A moment could not play. Check your connection and try a current browser.')} /><p>MOMENT {String(index + 1).padStart(2, '0')} / 3 SECONDS</p></article>)}</div><a className="primary-button" href={session.strip} download="still-studio.jpg">Save your photo strip ↓</a></>}<p className="camera-hint">{session?.local ? 'Keep the booth running and stay on the same Wi-Fi to watch.' : 'A private little link. Anyone you share it with can view these moments.'}</p></main></div>;
}
