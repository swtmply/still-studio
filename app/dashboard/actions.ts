'use server';

import { redirect } from 'next/navigation';
import { closeAdminSession, openAdminSession } from '@/lib/ink-admin';

export async function unlockDashboard(_previous: string, form: FormData) {
  const error = await openAdminSession(form.get('pin'));
  if (error) return error;
  redirect('/dashboard');
}

export async function lockDashboard() {
  await closeAdminSession();
  redirect('/dashboard');
}
