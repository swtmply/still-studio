'use client';

import { useState, type FormEvent } from 'react';
import { PostcardGuide } from '@/components/postcard-guide';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { inkLayout, inkLayouts, POSTCARD, type InkFrame, type InkLayout } from '@/lib/ink-layouts';

export function InkFrameAdmin() {
  const [layout, setLayout] = useState<InkLayout>(inkLayouts[0]);
  const [uploaded, setUploaded] = useState<InkFrame | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const key = data.get('key')?.toString().trim();
    data.delete('key');
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/ink/frames', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: data,
        signal: AbortSignal.timeout(30_000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not upload the frame.');
      setUploaded(result);
      form.reset();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not upload the frame.');
    } finally { setBusy(false); }
  }

  return <div className="ink-shell min-h-dvh bg-background text-foreground">
    <header className="ink-nav">
      <a className="ink-wordmark" href="/">Moments <em>in Ink</em></a>
      <Button variant="ghost" asChild><a href="/">Back to booth</a></Button>
    </header>
    <main className="ink-main">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <h1 className="ink-title">Upload a frame</h1>
        <div className="ink-design">
          <form className="flex flex-col gap-5" onSubmit={upload}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="frame-name">Frame name</FieldLabel>
                <Input id="frame-name" name="name" maxLength={48} required />
              </Field>
              <Field>
                <FieldLabel htmlFor="frame-layout">Layout</FieldLabel>
                <NativeSelect id="frame-layout" name="layout" value={layout.id} onChange={(event) => setLayout(inkLayout(event.target.value) ?? inkLayouts[0])}>
                  {inkLayouts.map((item) => <NativeSelectOption key={item.id} value={item.id}>{item.label}</NativeSelectOption>)}
                </NativeSelect>
                <FieldDescription>Keep the photo windows transparent. Each cell measures {POSTCARD.width / layout.columns} × {POSTCARD.height / layout.rows} px.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="frame-file">Transparent PNG</FieldLabel>
                <Input id="frame-file" name="image" type="file" accept="image/png" required aria-describedby="frame-spec" />
                <FieldDescription id="frame-spec">Exactly {POSTCARD.width} × {POSTCARD.height} px, portrait, up to 2 MB.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="frame-key">Admin key</FieldLabel>
                <Input id="frame-key" name="key" type="password" required autoComplete="current-password" />
              </Field>
            </FieldGroup>
            <Button type="submit" size="lg" disabled={busy}>{busy ? 'Uploading…' : 'Upload frame'}</Button>
            {uploaded && <p className="m-0 text-sm" role="status">“{uploaded.name}” is available in the booth.</p>}
            {error && <p className="m-0 text-sm text-destructive" role="alert">{error}</p>}
          </form>
          <PostcardGuide layout={layout} overlay={uploaded?.layout === layout.id ? uploaded.url : undefined} />
        </div>
      </div>
    </main>
  </div>;
}
