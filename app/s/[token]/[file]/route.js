import { readManifest, readShareFile, shareError, errorResponse } from '../../../../lib/shares';

export const runtime = 'nodejs';
export async function GET(request, { params }) {
  try {
    const { token, file } = await params;
    const manifest = await readManifest(token);
    if (![manifest.strip || 'strip.png', ...manifest.clips].includes(file)) throw shareError('Moment not found.', 404);
    const bytes = await readShareFile(token, file);
    if (!bytes) throw shareError('Moment not found.', 404);
    const type = file.endsWith('.jpg') ? 'image/jpeg' : file.endsWith('.png') ? 'image/png' : file.endsWith('.mp4') ? 'video/mp4' : 'video/webm';
    const headers = { 'Content-Type': type, 'Content-Length': String(bytes.length), 'Cache-Control': 'private, max-age=3600', 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
    const range = request.headers.get('range');
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      const start = match?.[1] ? Number(match[1]) : match?.[2] ? Math.max(0, bytes.length - Number(match[2])) : NaN;
      const end = match?.[1] && match[2] ? Math.min(Number(match[2]), bytes.length - 1) : bytes.length - 1;
      if (!Number.isSafeInteger(start) || start < 0 || start > end || start >= bytes.length) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes.length}` } });
      headers['Content-Range'] = `bytes ${start}-${end}/${bytes.length}`;
      headers['Content-Length'] = String(end - start + 1);
      return new Response(bytes.subarray(start, end + 1), { status: 206, headers });
    }
    return new Response(bytes, { headers });
  } catch (error) { return errorResponse(error); }
}
