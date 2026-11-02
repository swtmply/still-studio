'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { StudioContext, newSession } from './studio-context';
import { Icon, IconDefinitions } from './icon';
import CapturePage from './capture-page';
import SelectionPage from './selection-page';
import StylePage from './style-page';
import SharePage from './share-page';
import Gallery from './gallery';
import { readDraft, saveDraft } from '../lib/storage';

const steps = [
  { id: 'shoot', label: 'Take your shots' },
  { id: 'select', label: 'Pick your four' },
  { id: 'style', label: 'Make it yours' },
  { id: 'share', label: 'Keep the moment' },
];

export default function Studio() {
  const pathname = usePathname();
  const [session, setSession] = useState(null);
  const [message, setMessage] = useState('');
  const [offlineReady, setOfflineReady] = useState(false);
  const [offline, setOffline] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [localSharing, setLocalSharing] = useState(false);
  const restored = useRef(false);
  let page = steps.some((step) => pathname === `/${step.id}`) ? pathname.slice(1) : 'shoot';
  if (session) {
    if (page !== 'shoot' && session.shots.length < 4) page = 'shoot';
    else if (['style', 'share'].includes(page) && session.selected.length !== 4) page = 'select';
    else if (page === 'share' && !session.blob) page = 'style';
  }

  useEffect(() => {
    let active = true;
    readDraft().then((draft) => {
      if (!active) return;
      setSession(draft || newSession());
      if (pathname === '/' && draft?.page) history.replaceState(null, '', `/${draft.page}`);
    }).catch(() => {
      if (!active) return;
      setSession(newSession());
      setMessage('Local saving is unavailable. Keep this page open and download your finished strip.');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!session) return;
    if (pathname !== `/${page}`) history.replaceState(null, '', `/${page}`);
    document.title = `${steps.find((step) => step.id === page).label} — Still Studio`;
    if (restored.current) document.querySelector('.page h1')?.focus({ preventScroll: true });
    restored.current = true;
  }, [page, pathname, Boolean(session)]);

  useEffect(() => {
    if (!session) return;
    saveDraft(session).catch(() => setMessage('This session could not be saved locally. Keep this page open until you download your strip.'));
  }, [session]);

  useEffect(() => {
    setLocalSharing(['localhost', '127.0.0.1'].includes(location.hostname));
    const online = () => setOffline(!navigator.onLine);
    online();
    window.addEventListener('online', online);
    window.addEventListener('offline', online);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready).then(() => setOfflineReady(true)).catch(() => {});
    }
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', online);
    };
  }, []);

  function go(next, changes = {}) {
    setSession((current) => ({ ...current, ...changes, page: next }));
    setMessage('');
    history.pushState(null, '', `/${next}`);
    window.scrollTo(0, 0);
  }
  function reset() {
    setSession(newSession());
    setMessage('');
    history.replaceState(null, '', '/shoot');
    window.scrollTo(0, 0);
  }

  return <StudioContext.Provider value={{ session, setSession, message, setMessage, go, reset, localSharing }}>
    <IconDefinitions />
    <header className="site-header">
      <a className="brand" href="/shoot" aria-label="Still Studio home" onClick={(event) => { event.preventDefault(); go('shoot'); }}><span className="brand-mark"><i/><i/><i/><i/></span><span>still<span className="brand-period">.</span> <small>STUDIO</small></span></a>
      <button id="open-gallery" className="text-button" onClick={() => setGalleryOpen(true)}><Icon name="grid"/>My strips</button>
      <span className={`offline-pill${offlineReady ? '' : ' pending'}`}><span/>{offlineReady ? offline ? 'Working offline' : 'Offline ready' : 'Preparing offline'}</span>
    </header>
    <main>
      <ol className="steps" aria-label="Your session">{steps.map((step, index) => <li key={step.id} className={page === step.id ? 'active' : steps.findIndex((item) => item.id === page) > index ? 'complete' : ''} aria-current={page === step.id ? 'step' : undefined}><span>{String(index + 1).padStart(2, '0')}</span>{step.label}</li>)}</ol>
      {message && <div className="message" role="status">{message}</div>}
      {!session ? <p className="camera-hint">Getting your studio ready…</p> : page === 'shoot' ? <CapturePage/> : page === 'select' ? <SelectionPage/> : page === 'style' ? <StylePage/> : <SharePage/>}
    </main>
    <footer className="site-footer"><span><Icon name="lock"/>Captured on your device. Share only when you’re ready.</span><span>A moment to keep. <span className="footer-star">✳</span></span></footer>
    <Gallery open={galleryOpen} onClose={() => setGalleryOpen(false)} savedBlob={session?.blob}/>
  </StudioContext.Provider>;
}
