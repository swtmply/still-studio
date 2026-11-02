'use client';

import { useStudio, PageIntro } from './studio-context';
import { Icon } from './icon';
import { PHOTO_COUNTS, getLayout } from '../lib/strip';

export default function SelectionPage() {
  const { session, setSession, setMessage, go } = useStudio();
  const photoCount = session.photoCount || 4;
  const missing = Math.max(0, photoCount - session.shots.length);
  function select(index) {
    const already = session.selected.includes(index);
    if (!already && session.selected.length === photoCount) { setMessage(`You’ve picked ${photoCount}. Unselect one first to choose a different photo.`); return; }
    setMessage('');
    setSession((current) => {
      const selected = current.selected.includes(index);
      if (!selected && current.selected.length === (current.photoCount || 4)) return current;
      return { ...current, selected: selected ? current.selected.filter((item) => item !== index) : [...current.selected, index], blob: undefined, share: undefined };
    });
  }
  return <section id="page-select" className="page">
    <PageIntro eyebrow="THE GOOD ONES ARE YOURS TO CHOOSE" title={<>Pick your <em>favorite {photoCount === 4 ? 'four' : photoCount === 6 ? 'six' : 'eight'}.</em></>}>Tap the photos you love, in the order you want them on your print.</PageIntro>
    <div className="photo-count-choice"><span>Photos in your layout</span><div className="segmented" aria-label="Photos in your layout">{PHOTO_COUNTS.map((count) => <button key={count} className={photoCount === count ? 'selected' : ''} aria-pressed={photoCount === count} onClick={() => { setMessage(''); setSession((current) => ({ ...current, photoCount: count, selected: current.selected.slice(0, count), layoutId: getLayout(count).id, blob: undefined, share: undefined })); }}>{count} photos</button>)}</div></div>
    {missing > 0 && <p className="selection-hint">You’ll need {missing} more {missing === 1 ? 'shot' : 'shots'} for this layout. Use “Take more shots” below.</p>}
    <div className="selection-heading"><span id="selection-count" aria-live="polite">{session.selected.length} of {photoCount} selected</span><span>Tap again to unselect</span></div>
    <div className="photo-choices" aria-label={`Choose ${photoCount} photos`}>{session.shots.map((shot, index) => {
      const order = session.selected.indexOf(index);
      return <button key={index} className={`photo-choice${order >= 0 ? ' selected' : ''}`} aria-label={`Shot ${index + 1}${order >= 0 ? `, selected as photo ${order + 1}` : ''}`} aria-pressed={order >= 0} onClick={() => select(index)}><img src={shot.photo} alt={`Shot ${index + 1}`}/><span className="photo-choice-label">SHOT {String(index + 1).padStart(2, '0')}</span><span className="selection-number">{order >= 0 ? order + 1 : '+'}</span></button>;
    })}</div>
    <div className="page-actions"><span>{session.shots.length < 8 && <button className="text-button" onClick={() => go('shoot', { total: missing ? photoCount : 8 })}>Take more shots ({8 - session.shots.length} left)</button>}</span><button className="primary-button" onClick={() => go('style')} disabled={session.selected.length !== photoCount}>Style your photos <Icon name="arrow"/></button></div>
  </section>;
}
