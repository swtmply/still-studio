import { readManifest, errorResponse } from '../../../../lib/shares';

export const runtime = 'nodejs';
export async function GET(request, { params }) {
  try {
    const { token } = await params;
    const manifest = await readManifest(token);
    return Response.json({ ...manifest, strip: `/s/${token}/${manifest.strip || 'strip.png'}`, clips: manifest.clips.map((file) => `/s/${token}/${file}`) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
