import { del } from '@vercel/blob';
import { sleep } from 'workflow';

export async function expireInkShare(pathname: string, expiresAt: number) {
  'use workflow';
  await sleep(new Date(expiresAt));
  await deleteGif(pathname);
}

async function deleteGif(pathname: string) {
  'use step';
  await del(pathname);
}
