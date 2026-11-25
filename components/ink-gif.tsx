'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export function InkGif({ src, expiresAt }: { src: string; expiresAt: number }) {
  const [expired, setExpired] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setExpired(true), Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [expiresAt]);

  if (expired) return <p role="status">This postcard link has expired.</p>;
  if (failed) return <p role="status">The GIF could not load. Refresh the page to retry.</p>;
  return <>
    <img className="ink-postcard w-full" src={src} alt="Animated portrait postcard" onError={() => setFailed(true)} />
    <Button asChild><a href={src} download="moments-in-ink.gif">Save GIF</a></Button>
  </>;
}
