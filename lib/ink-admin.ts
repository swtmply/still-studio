import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'ink_admin';
const SESSION_MS = 8 * 60 * 60 * 1000;

function credentials() {
  const secret = process.env.INK_ADMIN_TOKEN;
  const pin = process.env.INK_ADMIN_PIN;
  if (!secret || secret.length < 32 || (pin && !/^\d{8,16}$/.test(pin))) return null;
  return { secret, pin: pin || secret };
}

function signature(expires: string, { secret, pin }: NonNullable<ReturnType<typeof credentials>>) {
  return createHmac('sha256', secret).update(`ink-dashboard:${expires}:${pin}`).digest();
}

export async function hasAdminSession() {
  const config = credentials();
  if (!config) return false;
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  const match = value?.match(/^(\d{13})\.([a-f0-9]{64})$/);
  if (!match || Number(match[1]) <= Date.now()) return false;
  return timingSafeEqual(Buffer.from(match[2], 'hex'), signature(match[1], config));
}

export async function openAdminSession(pin: FormDataEntryValue | null) {
  const config = credentials();
  if (!config) return 'Dashboard access has not been configured.';
  const digest = (value: string) => createHash('sha256').update(value).digest();
  if (typeof pin !== 'string' || pin.length > 128 || !timingSafeEqual(digest(pin.trim()), digest(config.pin))) {
    return 'Incorrect admin PIN.';
  }
  const expires = Date.now() + SESSION_MS;
  const token = `${expires}.${signature(String(expires), config).toString('hex')}`;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: new Date(expires),
  });
}

export async function closeAdminSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
