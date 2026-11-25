import { randomBytes, timingSafeEqual } from 'node:crypto';
import { put } from '@vercel/blob';
import sharp from 'sharp';
import { FRAME_LIMIT, FRAME_PREFIX, frameInfo, listFrames, NO_STORE, sameOrigin } from '@/lib/ink-blob';
import { FRAME_MAX_BYTES, inkLayout, POSTCARD } from '@/lib/ink-layouts';
import { errorResponse, readForm, shareError } from '@/lib/shares';

export async function GET() {
  try { return Response.json(await listFrames(), { headers: NO_STORE }); }
  catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const secret = process.env.INK_ADMIN_TOKEN;
    if (!secret || secret.length < 32) throw shareError('Frame uploads have not been configured.', 503);
    const supplied = Buffer.from(request.headers.get('authorization') ?? '');
    const expected = Buffer.from(`Bearer ${secret}`);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      throw shareError('The admin key is incorrect.', 401);
    }
    const form = await readForm(request);
    const image = form.get('image');
    const layout = inkLayout(form.get('layout'));
    const name = form.get('name')?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48).replace(/^-|-$/g, '');
    if (!layout || !name) throw shareError('Enter a frame name and select a layout.');
    if (!(image instanceof File) || image.type !== 'image/png' || !image.size || image.size > FRAME_MAX_BYTES) {
      throw shareError('Upload a PNG under 2 MB.');
    }
    const png = sharp(Buffer.from(await image.arrayBuffer()), { limitInputPixels: POSTCARD.width * POSTCARD.height });
    const meta = await png.metadata().catch(() => null);
    if (meta?.format !== 'png' || meta.width !== POSTCARD.width || meta.height !== POSTCARD.height || !meta.hasAlpha) {
      throw shareError('Use a 1110 × 1710 px portrait PNG with transparent photo windows.');
    }
    const { data, info } = await png.toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let row = 0; row < layout.rows; row++) {
      for (let column = 0; column < layout.columns; column++) {
        const x = Math.floor((column + 0.5) * info.width / layout.columns);
        const y = Math.floor((row + 0.5) * info.height / layout.rows);
        if (data[(y * info.width + x) * 4 + 3] !== 0) throw shareError('Leave the center of each photo cell transparent.');
      }
    }
    const cleaned = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
    if (cleaned.length > FRAME_MAX_BYTES) throw shareError('Optimize the PNG to under 2 MB.');
    if ((await listFrames()).length >= FRAME_LIMIT) throw shareError('The frame library is full.', 409);
    const pathname = `${FRAME_PREFIX}${layout.id}/${name}-${randomBytes(8).toString('hex')}.png`;
    await put(pathname, cleaned, { access: 'private', contentType: 'image/png', addRandomSuffix: false });
    return Response.json(frameInfo(pathname), { status: 201, headers: NO_STORE });
  } catch (error) { return errorResponse(error); }
}
