import { inkShare, NO_STORE, serveInkBlob } from '@/lib/ink-blob';

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const share = inkShare((await params).token);
  if (!share) return new Response(null, { status: 404, headers: NO_STORE });
  return serveInkBlob(share.pathname, 'image/gif', share.expiresAt);
}
