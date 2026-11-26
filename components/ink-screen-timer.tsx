'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import { Clock3 } from 'lucide-react';

export function InkScreenTimer({ onExpire }: { onExpire: () => void }) {
  const [seconds, setSeconds] = useState(60);
  const expire = useEffectEvent(onExpire);

  useEffect(() => {
    const deadline = performance.now() + 60_000;
    let finished = false;
    const update = () => {
      if (finished) return;
      const remaining = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0) {
        finished = true;
        expire();
      }
    };
    const clock = setInterval(update, 250);
    const timeout = setTimeout(update, 60_000);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(clock);
      clearTimeout(timeout);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  return <span role="timer" aria-label="Time left on this screen" className="inline-flex w-fit items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm tabular-nums">
    <Clock3 aria-hidden="true" className="size-4" />
    <span>{seconds === 60 ? '1:00' : '0:' + String(seconds).padStart(2, '0')}</span>
  </span>;
}
