import { randomBytes } from 'node:crypto';
import { del, put } from '@vercel/blob';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { start } from 'workflow/api';
import { expireInkShare } from '@/lib/expire-ink-share';
import { NO_STORE, sameOrigin } from '@/lib/ink-blob';
import { GIF_MAX_BYTES, SHARE_TTL_MS } from '@/lib/ink-layouts';
import { errorResponse, readForm, shareError } from '@/lib/shares';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const origin = sameOrigin(request);
    const form = await readForm(request);
    const gif = form.get('gif');
    if (!(gif instanceof File) || gif.type !== 'image/gif' || !gif.size || gif.size > GIF_MAX_BYTES) {
      throw shareError('Choose an animated GIF under 450 KB.');
    }
    const bytes = Buffer.from(await gif.arrayBuffer());
    const image = await sharp(bytes, { limitInputPixels: 66000 }).metadata().catch(() => null);
    if (image?.format !== 'gif' || image.width > 185 || image.height > 285 || image.pages !== 12) {
      throw shareError('The file must be a 12-frame postcard GIF.');
    }
    const expiresAt = Date.now() + SHARE_TTL_MS;
    const token = `${expiresAt}-${randomBytes(24).toString('hex')}`;
    const pathname = `ink/shares/${token}.gif`;
    const url = `${origin}/moments/${token}`;
    const qr = await QRCode.toDataURL(url, { margin: 3, width: 320 });
    // Start cleanup before writing so an interrupted request cannot orphan a GIF.
    await start(expireInkShare, [pathname, expiresAt]);
    try {
      await put(pathname, bytes, { access: 'private', contentType: 'image/gif', addRandomSuffix: false, ttlDays: 1 });
    } catch (error) {
      await del(pathname).catch(() => {});
      throw error;
    }
    return Response.json({ url, qr, expiresAt }, { status: 201, headers: NO_STORE });
  } catch (error) { return errorResponse(error); }
}
