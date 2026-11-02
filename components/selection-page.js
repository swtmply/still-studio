'use client';

import { useStudio, PageIntro } from './studio-context';
import { Icon } from './icon';

export default function SelectionPage() {
  const { session, setSession, setMessage, go } = useStudio();
  function select(index) {
    const already = session.selected.includes(index);
    if (!already && session.selected.length === 4) { setMessage('You’ve picked four. Unselect one first to choose a different photo.'); return; }
    setMessage('');
    setSession((current) => {
      const selected = current.selected.includes(index);
      if (!selected && current.selected.length === 4) return current;
      return { ...current, selected: selected ? current.selected.filter((item) => item !== index) : [...current.selected, index], blob: undefined, share: undefined };
    });
  }
  return <section id="page-select" className="page">
    <PageIntro eyebrow="THE GOOD ONES ARE YOURS TO CHOOSE" title={<>Pick your <em>favorite four.</em></>}>Tap the photos you love, in the order you want them on your strip.</PageIntro>
    <div className="selection-heading"><span id="selection-count" aria-live="polite">{session.selected.length} of 4 selected</span><span>Tap again to unselect</span></div>
    <div className="photo-choices" aria-label="Choose four photos">{session.shots.map((shot, index) => {
      const order = session.selected.indexOf(index);
      return <button key={index} className={`photo-choice${order >= 0 ? ' selected' : ''}`} aria-label={`Shot ${index + 1}${order >= 0 ? `, selected as photo ${order + 1}` : ''}`} aria-pressed={order >= 0} onClick={() => select(index)}><img src={shot.photo} alt={`Shot ${index + 1}`}/><span className="photo-choice-label">SHOT {String(index + 1).padStart(2, '0')}</span><span className="selection-number">{order >= 0 ? order + 1 : '+'}</span></button>;
    })}</div>
    <div className="page-actions"><span>{session.shots.length < 6 && <button className="text-button" onClick={() => go('shoot', { total: 6 })}>Take more shots ({6 - session.shots.length} left)</button>}</span><button className="primary-button" onClick={() => go('style')} disabled={session.selected.length !== 4}>Choose frame &amp; filter <Icon name="arrow"/></button></div>
  </section>;
}
