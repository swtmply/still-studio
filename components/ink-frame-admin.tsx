'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { InkLayoutChoices } from '@/components/ink-design';
import { PostcardGuide } from '@/components/postcard-guide';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { inkLayout, inkLayouts, POSTCARD, type InkFrame, type InkLayout } from '@/lib/ink-layouts';

const framesEndpoint = '/api/ink/frames';

export function InkFrameAdmin() {
  const [layout, setLayout] = useState<InkLayout>(inkLayouts[0]);
  const [frames, setFrames] = useState<InkFrame[]>([]);
  const [editing, setEditing] = useState<InkFrame | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState('');
  const [libraryError, setLibraryError] = useState('');
  const [status, setStatus] = useState('');
  const formTitle = useRef<HTMLHeadingElement>(null);

  async function loadFrames(signal?: AbortSignal) {
    setLoading(true);
    setLibraryError('');
    try {
      const response = await fetch(framesEndpoint, { cache: 'no-store', signal });
      if (!response.ok) throw new Error();
      setFrames(await response.json());
    } catch {
      if (!signal?.aborted) setLibraryError('Could not load the frame library.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadFrames(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (editing) formTitle.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function edit(frame: InkFrame) {
    if (frame.kind === 'upload') setLayout(inkLayout(frame.layout) ?? inkLayouts[0]);
    setFile(null);
    setFormError('');
    setEditing(frame);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set('layout', layout.id);
    setStatus('');
    setFormError('');
    if (!key.trim()) {
      setFormError('Enter the admin key to save changes.');
      return;
    }
    setBusy(true);
    try {
      const url = editing ? framesEndpoint + '?id=' + encodeURIComponent(editing.id) : framesEndpoint;
      const response = await fetch(url, {
        method: editing ? 'PATCH' : 'POST',
        headers: { Authorization: 'Bearer ' + key.trim() },
        body: data,
        signal: AbortSignal.timeout(30_000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save the frame.');
      setFrames((current) => editing ? current.map((frame) => frame.id === editing.id ? result : frame) : [...current, result]);
      setStatus(editing ? 'Frame updated.' : 'Frame uploaded.');
      form.reset();
      setEditing(null);
      setFile(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save the frame.');
    } finally { setBusy(false); }
  }

  async function remove(frame: InkFrame) {
    setLibraryError('');
    setStatus('');
    if (!key.trim()) {
      setLibraryError('Enter the admin key to delete a frame.');
      document.getElementById('frame-key')?.focus();
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(framesEndpoint + '?id=' + encodeURIComponent(frame.id), {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + key.trim() },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Could not delete the frame.');
      setFrames((current) => current.filter((item) => item.id !== frame.id));
      if (editing?.id === frame.id) {
        setEditing(null);
        setFile(null);
      }
      setStatus('Frame removed from the booth.');
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : 'Could not delete the frame.');
    } finally { setBusy(false); }
  }

  return <div className="ink-shell min-h-dvh bg-background text-foreground">
    <header className="ink-nav">
      <a className="ink-wordmark" href="/">Moments <em>in Ink</em></a>
      <Button variant="ghost" asChild><a href="/">Back to booth</a></Button>
    </header>
    <main className="ink-main">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-9">
        <h1 className="ink-title">Frame library</h1>
        <Field className="w-full max-w-sm">
          <FieldLabel htmlFor="frame-key">Admin key</FieldLabel>
          <Input id="frame-key" type="password" value={key} onChange={(event) => setKey(event.target.value)} autoComplete="current-password" />
        </Field>
        <section className="ink-design rounded-xl border border-border p-5 sm:p-7" aria-labelledby="frame-form-title">
          <form key={editing?.id ?? 'upload'} className="flex min-w-0 flex-col gap-5" onSubmit={save}>
            <h2 id="frame-form-title" tabIndex={-1} ref={formTitle} className="m-0 font-serif text-2xl">{editing ? 'Edit frame' : 'Upload a frame'}</h2>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="frame-name">Frame name</FieldLabel>
                <Input id="frame-name" name="name" maxLength={48} defaultValue={editing?.name ?? ''} required disabled={busy} />
              </Field>
              {editing?.kind !== 'preset' && <>
                <Field>
                  <p className="m-0 text-sm font-medium">Layout</p>
                  {editing ? <p className="m-0 text-sm">{layout.label}</p> : <InkLayoutChoices layout={layout} onLayout={setLayout} disabled={busy} />}
                  <FieldDescription>Each photo cell measures {POSTCARD.width / layout.columns} × {POSTCARD.height / layout.rows} px. Keep photo windows transparent and put any header or footer artwork in the opaque areas.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="frame-file">{editing ? 'Replace PNG (optional)' : 'Transparent PNG'}</FieldLabel>
                  <Input id="frame-file" name="image" type="file" accept="image/png" required={!editing} disabled={busy} aria-describedby="frame-spec" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
                  <FieldDescription id="frame-spec">Exactly {POSTCARD.width} × {POSTCARD.height} px, portrait, up to 2 MB.</FieldDescription>
                </Field>
              </>}
            </FieldGroup>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="lg" disabled={busy || loading}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Upload frame'}</Button>
              {editing && <Button type="button" variant="outline" size="lg" disabled={busy} onClick={() => { setEditing(null); setFile(null); setFormError(''); }}>Cancel</Button>}
            </div>
            {formError && <p className="m-0 text-sm text-destructive" role="alert">{formError}</p>}
          </form>
          <figure className="m-0 mx-auto w-full max-w-48 text-center">
            <PostcardGuide layout={layout} frame={editing ?? undefined} overlay={previewUrl || undefined} sample={Boolean(editing || previewUrl)} className="rounded-sm" />
            <figcaption className="mt-2 text-sm text-muted-foreground">Japanese Postcard · 100 × 148 mm</figcaption>
          </figure>
        </section>
        <section aria-labelledby="saved-frames" className="flex flex-col gap-4">
          <h2 id="saved-frames" className="m-0 font-serif text-2xl">Available frames</h2>
          <p className="m-0 min-h-5 text-sm text-muted-foreground" role="status">{loading ? 'Loading frames…' : status || (frames.length ? '' : 'No frames in the library yet.')}</p>
          {libraryError && <div className="flex flex-wrap items-center gap-2">
            <p className="m-0 text-sm text-destructive" role="alert">{libraryError}</p>
            <Button variant="outline" size="sm" onClick={() => loadFrames()}>Refresh library</Button>
          </div>}
          <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
            {frames.map((frame) => {
              const frameLayout = frame.kind === 'upload' ? inkLayout(frame.layout) ?? layout : layout;
              return <li key={frame.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-border p-3">
                <PostcardGuide layout={frameLayout} frame={frame} sample className="mx-auto max-w-32 rounded-sm" />
                <div className="text-center">
                  <h3 className="m-0 break-words text-sm capitalize">{frame.name}</h3>
                  <p className="m-0 mt-1 text-xs text-muted-foreground">{frame.kind === 'preset' ? 'All layouts' : frameLayout.label}</p>
                </div>
                <div className="mt-auto flex flex-wrap justify-center gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => edit(frame)} aria-label={'Edit ' + frame.name}><Pencil data-icon="inline-start" />Edit</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="ghost" size="sm" disabled={busy} aria-label={'Delete ' + frame.name}><Trash2 data-icon="inline-start" />Delete</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {frame.name}?</AlertDialogTitle>
                        <AlertDialogDescription>{frame.kind === 'preset' ? 'This removes the preset from the Moments in Ink booth.' : 'This permanently removes the uploaded PNG from the booth.'}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => remove(frame)}>Delete frame</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>;
            })}
          </ul>
        </section>
      </div>
    </main>
  </div>;
}
