import { InkGif } from '@/components/ink-gif';
import { Button } from '@/components/ui/button';
import { blobExists, inkShare } from '@/lib/ink-blob';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'A postcard from Moments in Ink',
  robots: { index: false, follow: false },
};

export default async function MomentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = inkShare(token);
  const available = share && Date.now() < share.expiresAt && await blobExists(share.pathname);
  return <div className="ink-shell min-h-dvh bg-background text-foreground">
    <header className="ink-nav"><a href="/" className="ink-wordmark">Moments <em>in Ink</em></a></header>
    <main className="ink-main">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <h1 className="ink-title">{available ? 'Your postcard' : 'This postcard is unavailable'}</h1>
        {available && <InkGif src={`/api/ink/media/${token}`} expiresAt={share.expiresAt} />}
        <Button asChild variant="outline"><a href="/">Visit the booth</a></Button>
      </div>
    </main>
  </div>;
}
