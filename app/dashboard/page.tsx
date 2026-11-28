import { InkDashboardLogin } from '@/components/ink-dashboard-login';
import { InkFrameAdmin } from '@/components/ink-frame-admin';
import { Button } from '@/components/ui/button';
import { hasAdminSession } from '@/lib/ink-admin';
import { lockDashboard } from './actions';

export const metadata = {
  title: 'Dashboard · Moments in Ink',
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const unlocked = await hasAdminSession();

  return <div className="ink-shell min-h-dvh bg-background text-foreground">
    <header className="ink-nav">
      <a className="ink-wordmark" href="/">Moments <em>in Ink</em></a>
      {unlocked && <form action={lockDashboard}><Button type="submit" variant="outline">Lock dashboard</Button></form>}
    </header>
    <main className="ink-main">
      {unlocked ? <InkFrameAdmin /> : <InkDashboardLogin />}
    </main>
  </div>;
}
