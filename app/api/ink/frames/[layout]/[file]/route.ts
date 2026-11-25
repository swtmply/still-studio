import { FRAME_PREFIX, frameInfo, NO_STORE, serveInkBlob } from '@/lib/ink-blob';

export async function GET(_request: Request, { params }: { params: Promise<{ layout: string; file: string }> }) {
  const { layout, file } = await params;
  const path = `${FRAME_PREFIX}${layout}/${file}`;
  if (!frameInfo(path)) return new Response(null, { status: 404, headers: NO_STORE });
  return serveInkBlob(path, 'image/png');
}
