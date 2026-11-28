import { randomBytes } from 'node:crypto';
import { BlobPreconditionFailedError, copy, del, put } from '@vercel/blob';
import sharp from 'sharp';
import { FRAME_LIMIT, FRAME_PREFIX, frameInfo, listUploadedFrames, NO_STORE, sameOrigin } from '@/lib/ink-blob';
import { findPreset, listFrames, setPresetName } from '@/lib/ink-frame-library';
import { FRAME_MAX_BYTES, inkLayout, POSTCARD, type InkLayout } from '@/lib/ink-layouts';
import { errorResponse, readForm, shareError } from '@/lib/shares';
import { hasAdminSession } from '@/lib/ink-admin';

const pngOptions = { access: 'private', contentType: 'image/png' } satisfies Parameters<typeof put>[2];

async function requireAdmin(request: Request) {
  sameOrigin(request);
  if (!await hasAdminSession()) throw shareError('Unlock the dashboard to manage frames.', 401);
}

function frameName(form: FormData) {
  const entry = form.get('name');
  const name = typeof entry === 'string' ? entry.trim() : '';
  if (!name || name.length > 48) throw shareError('Enter a frame name of up to 48 characters.');
  return name;
}

function uploadPath(layout: string, name: string, id: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!slug) throw shareError('Use at least one letter or number in the frame name.');
  return FRAME_PREFIX + layout + '/' + slug + '-' + id + '.png';
}

async function validatePng(image: FormDataEntryValue | null, layout: InkLayout) {
  if (!(image instanceof File) || image.type !== 'image/png' || !image.size || image.size > FRAME_MAX_BYTES) {
    throw shareError('Upload a PNG under 2 MB.');
  }
  const png = sharp(Buffer.from(await image.arrayBuffer()), { limitInputPixels: POSTCARD.width * POSTCARD.height });
  const meta = await png.metadata().catch(() => null);
  if (meta?.format !== 'png' || meta.width !== POSTCARD.width || meta.height !== POSTCARD.height || !meta.hasAlpha) {
    throw shareError('Use a 1110 × 1710 px portrait PNG with transparent photo windows.');
  }
  const { data, info } = await png.toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true }).catch(() => {
    throw shareError('This PNG could not be read.');
  });
  for (let row = 0; row < layout.rows; row++) {
    for (let column = 0; column < layout.columns; column++) {
      const x = Math.floor((column + 0.5) * info.width / layout.columns);
      const y = Math.floor((row + 0.5) * info.height / layout.rows);
      if (data[(y * info.width + x) * 4 + 3] !== 0) throw shareError('Leave the center of each photo cell transparent.');
    }
  }
  const cleaned = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  if (cleaned.length > FRAME_MAX_BYTES) throw shareError('Optimize the PNG to under 2 MB.');
  return cleaned;
}

async function findUpload(id: string | null) {
  if (!id || !/^[a-f0-9]{16}$/.test(id)) throw shareError('Frame not found.', 404);
  const upload = (await listUploadedFrames()).find(({ frame }) => frame.id === id);
  if (!upload) throw shareError('Frame not found. Refresh the library and try again.', 404);
  return upload;
}

function frameError(error: unknown) {
  if (error instanceof BlobPreconditionFailedError) {
    return errorResponse(shareError('The frame library changed. Refresh and try again.', 409));
  }
  return errorResponse(error);
}

export async function GET() {
  try { return Response.json(await listFrames(), { headers: NO_STORE }); }
  catch (error) { return frameError(error); }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const form = await readForm(request);
    const layout = inkLayout(form.get('layout'));
    const name = frameName(form);
    if (!layout) throw shareError('Select a layout.');
    const png = await validatePng(form.get('image'), layout);
    if ((await listUploadedFrames()).length >= FRAME_LIMIT) throw shareError('The frame library is full.', 409);
    const pathname = uploadPath(layout.id, name, randomBytes(8).toString('hex'));
    const stored = await put(pathname, png, pngOptions);
    return Response.json(frameInfo(pathname, stored.etag), { status: 201, headers: NO_STORE });
  } catch (error) { return frameError(error); }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);
    const id = new URL(request.url).searchParams.get('id');
    const form = await readForm(request);
    const name = frameName(form);
    const preset = findPreset(id);
    if (preset) {
      await setPresetName(preset.id, name);
      return Response.json({ kind: 'preset', id, design: preset.id, name }, { headers: NO_STORE });
    }

    const upload = await findUpload(id);
    const layout = inkLayout(upload.frame.layout);
    if (!layout) throw shareError('Frame layout not found.', 404);
    const image = form.get('image');
    const png = image instanceof File && image.size ? await validatePng(image, layout) : null;
    const pathname = uploadPath(layout.id, name, upload.frame.id);
    let version = upload.etag;
    if (pathname === upload.pathname) {
      if (png) version = (await put(pathname, png, { ...pngOptions, allowOverwrite: true, ifMatch: upload.etag })).etag;
    } else {
      const stored = png ? await put(pathname, png, pngOptions) : await copy(upload.pathname, pathname, { ...pngOptions, ifMatch: upload.etag });
      version = stored.etag;
      try { await del(upload.pathname, { ifMatch: upload.etag }); }
      catch (error) {
        await del(pathname).catch(() => {});
        throw error;
      }
    }
    return Response.json(frameInfo(pathname, version), { headers: NO_STORE });
  } catch (error) { return frameError(error); }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin(request);
    const id = new URL(request.url).searchParams.get('id');
    const preset = findPreset(id);
    if (preset) await setPresetName(preset.id, null);
    else {
      const upload = await findUpload(id);
      await del(upload.pathname, { ifMatch: upload.etag });
    }
    return new Response(null, { status: 204, headers: NO_STORE });
  } catch (error) { return frameError(error); }
}
