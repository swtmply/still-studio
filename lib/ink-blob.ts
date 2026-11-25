import { BlobNotFoundError, get, head, list } from '@vercel/blob';
import { inkLayout, type InkFrame } from './ink-layouts';
import { shareError } from './shares';

export const NO_STORE = { 'Cache-Control': 'private, no-store' };
export const FRAME_PREFIX = 'ink/frames/';
export const FRAME_LIMIT = 24;
export const INK_TOKEN = /^(\d{13})-([a-f0-9]{48})$/;

export function inkShare(token: string) {
  const match = INK_TOKEN.exec(token);
  if (!match) return null;
  return { pathname: `ink/shares/${token}.gif`, expiresAt: Number(match[1]) };
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host || (origin !== `https://${host}` && origin !== `http://${host}`)) {
    throw shareError('Open Moments in Ink to continue.', 403);
  }
  return origin;
}

export function frameInfo(pathname: string): InkFrame | null {
  const match = /^ink\/frames\/(six|four|one)\/([a-z0-9-]{1,48})-([a-f0-9]{16})\.png$/.exec(pathname);
  const layout = match && inkLayout(match[1]);
  if (!match || !layout) return null;
  const [, , name, id] = match;
  return { id, name: name.replaceAll('-', ' '), layout: layout.id, url: '/api/ink/frames/' + pathname.slice(FRAME_PREFIX.length) };
}

export async function listFrames() {
  const { blobs } = await list({ prefix: FRAME_PREFIX, limit: FRAME_LIMIT + 1 });
  return blobs.flatMap(({ pathname }) => frameInfo(pathname) ?? []);
}

export async function blobExists(pathname: string) {
  try {
    await head(pathname);
    return true;
  } catch (error) {
    if (error instanceof BlobNotFoundError) return false;
    throw error;
  }
}

export async function serveInkBlob(pathname: string, contentType: string, expiresAt = Infinity) {
  if (Date.now() >= expiresAt) return new Response(null, { status: 410, headers: NO_STORE });
  try {
    const blob = await get(pathname, { access: 'private' });
    if (!blob || blob.statusCode !== 200) return new Response(null, { status: 404, headers: NO_STORE });
    if (Date.now() >= expiresAt) {
      await blob.stream.cancel();
      return new Response(null, { status: 410, headers: NO_STORE });
    }
    return new Response(blob.stream, { headers: { ...NO_STORE, 'Content-Type': contentType } });
  } catch (error) {
    if (error instanceof BlobNotFoundError) return new Response(null, { status: 404, headers: NO_STORE });
    throw error;
  }
}
