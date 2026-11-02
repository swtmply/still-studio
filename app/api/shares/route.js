import { randomBytes } from 'node:crypto';
import QRCode from 'qrcode';
import { useCloud, shareError, localOrigin, readForm, writeShare, errorResponse } from '../../../lib/shares';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request) {
  try {
    let source;
    try { source = new URL(request.headers.get('origin')); } catch { throw shareError('Open the studio to create a QR link.', 403); }
    if (!['http:', 'https:'].includes(source.protocol) || source.host !== request.headers.get('host')) throw shareError('Open the studio to create a QR link.', 403);
    const origin = source.origin;
    if (process.env.VERCEL && !useCloud()) throw shareError('Connect a private Vercel Blob store to enable QR sharing.', 503);
    if (!useCloud() && !['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw shareError('Open the studio on the booth computer using localhost for local sharing.', 403);
    const form = await readForm(request);
    let details;
    try { details = JSON.parse(form.get('details')); } catch { throw shareError('Invalid session details.'); }
    if (!details || !['color', 'mono', 'warm'].includes(details.filter) || !Number.isFinite(details.createdAt)) throw shareError('Invalid session details.');
    const strip = form.get('strip');
    const clips = form.getAll('clips');
    if (!(strip instanceof File) || strip.type !== 'image/jpeg' || !strip.size || strip.size > 900000) throw shareError('A compressed JPEG strip under 900 KB is required.');
    if (clips.length !== 4 || clips.some((clip) => !(clip instanceof File) || !/^video\/(mp4|webm)(;|$)/.test(clip.type) || !clip.size || clip.size > 900000)) throw shareError('Select four compressed video moments, each under 900 KB.');
    const token = randomBytes(24).toString('hex');
    const cloud = useCloud();
    const url = `${cloud ? origin : localOrigin(origin)}/s/${token}`;
    const clipFiles = clips.map((clip, index) => `${index}.${clip.type.startsWith('video/mp4') ? 'mp4' : 'webm'}`);
    const files = [{ name: 'strip.jpg', type: 'image/jpeg', bytes: Buffer.from(await strip.arrayBuffer()) }, ...await Promise.all(clips.map(async (clip, index) => ({ name: clipFiles[index], type: clip.type, bytes: Buffer.from(await clip.arrayBuffer()) })))];
    await writeShare(token, files, { filter: details.filter, createdAt: details.createdAt, clips: clipFiles, strip: 'strip.jpg', local: !cloud });
    const svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 4, width: 300, color: { dark: '#302f2b', light: '#ffffff' } });
    return Response.json({ url, qr: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, statusPath: `/api/shares/${token}`, local: !cloud }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
