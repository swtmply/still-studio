import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { networkInterfaces } from 'node:os';
import { get, put, del } from '@vercel/blob';

export const TOKEN = /^[a-f0-9]{48}$/;
export const MAX_SHARE_BYTES = 4000000;
export const useCloud = () => process.env.SHARE_MODE !== 'local' && Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

export function shareError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function filePath(token, file) {
  if (!TOKEN.test(token) || !/^(session\.json|strip\.(jpg|png)|[0-3]\.(mp4|webm))$/.test(file)) throw shareError('Moment not found.', 404);
  return `shares/${token}/${file}`;
}

export function localOrigin(origin) {
  const addresses = Object.entries(networkInterfaces()).flatMap(([name, entries]) =>
    (entries || []).filter((entry) => entry.family === 'IPv4' && !entry.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(entry.address)).map((entry) => ({ name, address: entry.address })),
  );
  addresses.sort((a, b) => Number(/wi-?fi|wireless/i.test(b.name)) - Number(/wi-?fi|wireless/i.test(a.name)));
  const host = process.env.SHARE_HOST ? addresses.find((entry) => entry.address === process.env.SHARE_HOST)?.address : addresses[0]?.address;
  if (!host) throw shareError('Connect the booth to local Wi-Fi before creating a QR link.', 503);
  return `http://${host}:${new URL(origin).port || 5173}`;
}

export async function readShareFile(token, file) {
  const pathname = filePath(token, file);
  if (useCloud()) {
    const result = await get(pathname, { access: 'private' });
    if (!result || result.statusCode !== 200) return null;
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }
  if (process.env.VERCEL) throw shareError('Connect a private Vercel Blob store to enable QR sharing.', 503);
  try { return await readFile(join(process.cwd(), '.data', pathname)); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

export async function readManifest(token) {
  const bytes = await readShareFile(token, 'session.json');
  if (!bytes) throw shareError('This moment is no longer available. Ask the booth for a new QR code.', 404);
  return JSON.parse(bytes.toString('utf8'));
}

export async function writeShare(token, files, details) {
  const uploaded = [];
  const entries = [...files, { name: 'session.json', type: 'application/json', bytes: Buffer.from(JSON.stringify(details)) }];
  try {
    for (const file of entries) {
      const pathname = filePath(token, file.name);
      if (useCloud()) {
        const result = await put(pathname, file.bytes, { access: 'private', contentType: file.type, addRandomSuffix: false, cacheControlMaxAge: 3600 });
        uploaded.push(result.url);
      } else {
        if (process.env.VERCEL) throw shareError('Connect a private Vercel Blob store to enable QR sharing.', 503);
        const directory = join(process.cwd(), '.data', 'shares', token);
        await mkdir(directory, { recursive: true });
        await writeFile(join(directory, file.name), file.bytes);
      }
    }
  } catch (error) {
    if (uploaded.length) await del(uploaded).catch(() => {});
    throw error;
  }
}

export async function readForm(request) {
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) throw shareError('Expected photos and video files.');
  const reader = request.body?.getReader();
  if (!reader) throw shareError('No moments were received.');
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_SHARE_BYTES) { await reader.cancel(); throw shareError('These moments are too large to share. Download your strip instead.', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return new Response(Buffer.concat(chunks), { headers: { 'content-type': request.headers.get('content-type') } }).formData();
}

export function errorResponse(error) {
  if (!error.status) console.error('Sharing request failed:', error.name, error.message);
  return Response.json({ error: error.status ? error.message : 'Sharing is unavailable. Storage may be full or disconnected; your originals are still safe on this device.' }, { status: error.status || 503, headers: { 'Cache-Control': 'no-store' } });
}
