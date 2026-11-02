'use client';

import { useEffect, useRef, useState } from 'react';
import { frames, filters, dateLabel, makeStrip } from '../lib/strip';
import { storeStrip } from '../lib/storage';
import { useStudio, PageIntro } from './studio-context';
import { Icon } from './icon';

export default function StylePage() {
  const { session, setSession, setMessage, go } = useStudio();
  const [saving, setSaving] = useState(false);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  function style(changes) { setSession({ ...session, ...changes, blob: undefined, share: undefined }); }
  async function finish() {
    if (saving) return;
    setSaving(true);
    try {
      const design = frames.find((frame) => frame.id === session.frameId);
      const blob = await makeStrip(session.selected.map((index) => session.shots[index].photo), design, session.filter, session.createdAt);
      if (!active.current) return;
      await storeStrip({ id: session.id, createdAt: session.createdAt, frame: design.name, blob }).catch(() => {});
      if (active.current) go('share', { blob });
    } catch (error) {
      if (active.current) setMessage(error instanceof Error ? error.message : 'Could not prepare your strip. Try again.');
    } finally { if (active.current) setSaving(false); }
  }
  return <section id="page-style" className="page">
    <PageIntro eyebrow="NOW, ADD YOUR LITTLE TOUCH" title={<>Your photos. <em>Your mood.</em></>}>A frame to bring it together. A finish to make it feel like you.</PageIntro>
    <div className="style-layout"><div className="style-settings"><div className="field-heading"><h2>Pick a frame</h2><span>Six little moods</span></div><div className="frame-options" aria-label="Frame designs">{frames.map((frame) => <button key={frame.id} className={`frame-option${frame.id === session.frameId ? ' selected' : ''}`} aria-label={`${frame.name} frame`} aria-pressed={frame.id === session.frameId} disabled={saving} onClick={() => style({ frameId: frame.id })}><div className="mini-strip" data-frame={frame.id} aria-hidden="true"><i/><i/><i/><i/></div><span>{frame.name}</span>{frame.id === session.frameId && <Icon className="frame-check" name="check"/>}</button>)}</div><div className="setting-divider"/><div className="field-heading"><h2>Photo finish</h2></div><div className="segmented" aria-label="Photo finish">{[{ id: 'color', name: 'Original' }, { id: 'mono', name: 'B & W' }, { id: 'warm', name: 'Warm' }].map((filter) => <button key={filter.id} className={session.filter === filter.id ? 'selected' : ''} aria-pressed={session.filter === filter.id} disabled={saving} onClick={() => style({ filter: filter.id })}>{filter.name}</button>)}</div><p className="style-note">Four little moments. One keepsake.<br/>You’re almost there.</p></div>
      <div className="strip-stage"><span className="strip-note">a little piece of right now ↴</span><div className="photo-strip" data-frame={session.frameId}><div className="strip-topline"><span>STILL STUDIO</span><span>FOUR LITTLE MOMENTS</span></div>{session.selected.map((index, order) => <div className="photo-slot" key={order}><img src={session.shots[index].photo} alt={`Selected photo ${order + 1}`} style={{ filter: filters[session.filter] }}/></div>)}<div className="strip-footer"><strong>still.</strong><span>A MOMENT TO KEEP</span><small>{dateLabel(new Date(session.createdAt))}</small></div></div><p className="strip-detail">4 photos · 2 × 6 strip</p></div>
    </div>
    <div className="page-actions"><button className="text-button" disabled={saving} onClick={() => go('select')}>← Change your photos</button><button className="primary-button" disabled={saving} onClick={finish}>{saving ? 'Preparing your keepsake…' : 'Keep this moment'}<Icon name="arrow"/></button></div>
  </section>;
}
