'use client';

import { useEffect, useRef, useState } from 'react';
import { frames, filters, filterOptions, layouts, getLayout, makeStrip } from '../lib/strip';
import { storeStrip } from '../lib/storage';
import { useStudio, PageIntro } from './studio-context';
import { Icon } from './icon';

function PrintPreview({ session, frame, layout }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let previewUrl;
    setBusy(true);
    setError('');
    makeStrip(session.selected.map((index) => session.shots[index].photo), frame, session.filter, session.createdAt, layout, Math.min(1, 900 / Math.max(layout.width, layout.height)))
      .then((blob) => {
        if (!active) return;
        previewUrl = URL.createObjectURL(blob);
        setUrl(previewUrl);
      }).catch(() => active && setError('The preview could not load. Try another design.'))
      .finally(() => active && setBusy(false));
    return () => { active = false; if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [session.selected, session.shots, session.filter, session.createdAt, frame, layout]);
  return <div className="print-stage"><span className="print-note">a little piece of right now ↴</span><div className="rendered-preview" aria-busy={busy}>{url && <img src={url} alt={`${layout.name} with ${session.selected.length} photos in the ${frame.name} frame`}/>}<span className="preview-status" role="status">{error || (busy ? 'Updating your preview…' : '')}</span></div><p className="strip-detail">{layout.width} × {layout.height} PNG · {layout.photoCount} photos</p><p className="crop-note">Photos are centered to fit each layout.</p></div>;
}

export default function StylePage() {
  const { session, setSession, setMessage, go } = useStudio();
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('layout');
  const active = useRef(true);
  const photoCount = session.photoCount || 4;
  const layout = getLayout(photoCount, session.layoutId);
  const frame = frames.find((item) => item.id === session.frameId) || frames[0];
  const filter = filterOptions.find((item) => item.id === session.filter) || filterOptions[0];
  const availableLayouts = layouts.filter((item) => item.photoCount === photoCount);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  function style(changes) { setSession((current) => ({ ...current, ...changes, blob: undefined, share: undefined })); }
  async function finish() {
    if (saving) return;
    setSaving(true);
    try {
      const blob = await makeStrip(session.selected.map((index) => session.shots[index].photo), frame, session.filter, session.createdAt, layout);
      if (!active.current) return;
      await storeStrip({ id: session.id, createdAt: session.createdAt, frame: frame.name, layout: layout.name, photoCount, blob }).catch(() => {});
      if (active.current) go('share', { blob, layoutId: layout.id });
    } catch (error) {
      if (active.current) setMessage(error instanceof Error ? error.message : 'Could not prepare your print. Try again.');
    } finally { if (active.current) setSaving(false); }
  }
  return <section id="page-style" className="page">
    <PageIntro eyebrow="NOW, ADD YOUR LITTLE TOUCH" title={<>Your photos. <em>Your mood.</em></>}>A layout for your moments. A frame and finish that feel like you.</PageIntro>
    <div className="style-layout"><div className="style-settings">
      <div className="style-tabs segmented" role="group" aria-label="Styling options">{['layout', 'frame', 'filter'].map((name) => <button key={name} className={tab === name ? 'selected' : ''} aria-pressed={tab === name} aria-controls="style-options" disabled={saving} onClick={() => setTab(name)}>{name === 'layout' ? 'Layout' : name === 'frame' ? 'Frame' : 'Filter'}</button>)}</div>
      <div id="style-options" className="style-options">
        <div className="field-heading"><h2>{tab === 'layout' ? 'Pick a layout' : tab === 'frame' ? 'Pick a frame' : 'Photo finish'}</h2><span>{tab === 'layout' ? `${photoCount} favorite photos` : tab === 'frame' ? `${frames.length} little moods` : `${filterOptions.length} finishes`}</span></div>
        {tab === 'layout' && <div className="layout-options" style={{ gridTemplateColumns: `repeat(${availableLayouts.length}, minmax(0, 1fr))` }} aria-label="Photo layouts">{availableLayouts.map((item) => <button key={item.id} className={`layout-option${layout.id === item.id ? ' selected' : ''}`} aria-label={`${item.name} layout`} aria-pressed={layout.id === item.id} disabled={saving} onClick={() => style({ layoutId: item.id })}><span className="layout-mini-holder"><span className="layout-mini" style={{ gridTemplateColumns: `repeat(${item.columns}, 1fr)`, aspectRatio: item.width / item.height, width: item.width > item.height ? 75 : Math.max(18, 60 * item.width / item.height) }}>{Array.from({ length: item.photoCount }, (_, index) => <i key={index}/>)}</span></span><span>{item.name}</span><small>{item.columns} × {item.photoCount / item.columns}</small>{layout.id === item.id && <Icon className="frame-check" name="check"/>}</button>)}</div>}
        {tab === 'frame' && <div className="frame-options" aria-label="Frame designs">{frames.map((item) => <button key={item.id} className={`frame-option${item.id === frame.id ? ' selected' : ''}`} aria-label={`${item.name} frame`} aria-pressed={item.id === frame.id} disabled={saving} onClick={() => style({ frameId: item.id })}><div className="mini-strip" data-pattern={item.pattern} style={{ '--paper': item.paper, '--ink': item.ink, '--slot': `${item.ink}30`, '--decoration': item.accent || item.ink }} aria-hidden="true"><i/><i/><i/><i/></div><span>{item.name}</span>{item.id === frame.id && <Icon className="frame-check" name="check"/>}</button>)}</div>}
        {tab === 'filter' && <div className="filter-options" aria-label="Photo finishes">{filterOptions.map((item) => <button key={item.id} className={`filter-option${item.id === filter.id ? ' selected' : ''}`} aria-label={`${item.name} filter`} aria-pressed={item.id === filter.id} disabled={saving} onClick={() => style({ filter: item.id })}><img src={session.shots[session.selected[0]].photo} alt="" style={{ filter: filters[item.id] }}/><span>{item.name}</span>{item.id === filter.id && <Icon className="frame-check" name="check"/>}</button>)}</div>}
      </div>
      <div className="style-summary"><span>{photoCount} photos</span><span>{layout.name}</span><span>{frame.name}</span><span>{filter.name}</span></div>
    </div><PrintPreview session={session} frame={frame} layout={layout}/></div>
    <div className="page-actions"><button className="text-button" disabled={saving} onClick={() => go('select')}>← Change your photos</button><button className="primary-button" disabled={saving} onClick={finish}>{saving ? 'Preparing your keepsake…' : 'Keep this moment'}<Icon name="arrow"/></button></div>
  </section>;
}
