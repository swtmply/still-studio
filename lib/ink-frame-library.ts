import { BlobNotFoundError, get, put } from '@vercel/blob';
import { listUploadedFrames } from './ink-blob';
import type { InkFrame, InkPreset } from './ink-layouts';
import { frames } from './strip';

const SETTINGS = 'ink/frame-presets.json';
type PresetNames = Record<string, string | null>;

export function findPreset(id: string | null) {
  return frames.find((frame) => `preset-${frame.id}` === id);
}

async function readPresetSettings(): Promise<{ names: PresetNames; etag?: string }> {
  try {
    const blob = await get(SETTINGS, { access: 'private', useCache: false });
    if (blob?.statusCode === 200) {
      return { names: await new Response(blob.stream).json(), etag: blob.blob.etag };
    }
  } catch (error) {
    if (!(error instanceof BlobNotFoundError)) throw error;
  }
  return { names: {} };
}

export async function setPresetName(design: string, name: string | null) {
  const { names, etag } = await readPresetSettings();
  await put(SETTINGS, JSON.stringify({ ...names, [design]: name }), {
    access: 'private',
    contentType: 'application/json',
    allowOverwrite: Boolean(etag),
    ifMatch: etag,
  });
}

export async function listFrames(): Promise<InkFrame[]> {
  const [{ names }, uploads] = await Promise.all([readPresetSettings(), listUploadedFrames()]);
  const presets: InkPreset[] = frames.flatMap((frame) => {
    const name = names[frame.id];
    return name === null ? [] : [{ kind: 'preset', id: `preset-${frame.id}`, design: frame.id, name: name ?? frame.name }];
  });
  return [...presets, ...uploads.map(({ frame }) => frame)];
}
