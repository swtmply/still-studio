'use client';

import { useEffect, useRef, useState } from 'react';
import { openDatabase } from '../lib/storage';
import { dateLabel } from '../lib/strip';
import { Icon } from './icon';

export default function Gallery({ open, onClose, savedBlob }) {
  const dialog = useRef(null);
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  useEffect(() => {
    if (!open) { dialog.current?.close(); return; }
    dialog.current.showModal();
    let active = true;
    const urls = [];
    openDatabase().then((database) => new Promise((resolve, reject) => {
      const request = database.transaction('strips').objectStore('strips').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    })).then((items) => {
      if (!active) return;
      setRecords(items.sort((a, b) => b.createdAt - a.createdAt).map((record) => {
        const url = URL.createObjectURL(record.blob); urls.push(url); return { ...record, url };
      }));
      setError('');
    }).catch(() => active && setError('Your saved strips could not be loaded.'));
    return () => { active = false; urls.forEach((url) => URL.revokeObjectURL(url)); };
  }, [open, savedBlob]);
  async function remove(record) {
    if (confirmation !== record.id) { setConfirmation(record.id); return; }
    try {
      const database = await openDatabase();
      await new Promise((resolve, reject) => {
        const tx = database.transaction('strips', 'readwrite'); tx.objectStore('strips').delete(record.id);
        tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
      });
      setRecords((current) => current.filter((item) => item.id !== record.id));
      setConfirmation(null);
    } catch { setError('This strip could not be deleted. Try again.'); }
  }
  return <dialog ref={dialog} onClose={onClose}><div className="dialog-heading"><div><p className="eyebrow">YOUR LITTLE COLLECTION</p><h2>My strips<span>.</span></h2></div><button className="icon-button" onClick={onClose} aria-label="Close saved strips"><Icon name="close"/></button></div><p className="gallery-description">Saved in this browser, on this device. Download your favorites to keep them safe.</p><div className="gallery-items">{error && <p className="gallery-error">{error}</p>}{!records.length && !error && <p className="gallery-empty">Your collection starts with a moment.<br/>Finish your first session to save a strip.</p>}{records.map((record) => <article className="saved-strip" key={record.id}><img src={record.url} alt={`Saved ${record.frame} print`}/><p>{record.frame}{record.layout ? ` · ${record.layout}` : ''} · {dateLabel(new Date(record.createdAt))}</p><div className="saved-actions"><a className="text-button" href={record.url} download={`still-${record.id}.png`}><Icon name="download"/>Save PNG</a><button className={`delete-strip${confirmation === record.id ? ' confirm' : ''}`} onClick={() => remove(record)}>{confirmation === record.id ? 'Confirm?' : 'Delete'}</button></div></article>)}</div></dialog>;
}
