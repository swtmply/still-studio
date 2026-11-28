'use client';

import { useActionState } from 'react';
import { unlockDashboard } from '@/app/dashboard/actions';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export function InkDashboardLogin() {
  const [error, unlock, pending] = useActionState(unlockDashboard, '');

  return <form action={unlock} className="mx-auto flex w-full max-w-sm flex-col gap-6">
    <h1 className="ink-title">Dashboard</h1>
    <FieldGroup>
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor="admin-pin">Admin PIN</FieldLabel>
        <Input id="admin-pin" name="pin" type="password" autoComplete="current-password" required maxLength={128}
          aria-invalid={Boolean(error)} aria-describedby={error ? 'admin-pin-error' : undefined} />
        {error && <p id="admin-pin-error" role="alert" className="m-0 text-sm text-destructive">{error}</p>}
      </Field>
    </FieldGroup>
    <Button type="submit" size="lg" disabled={pending}>{pending ? 'Unlocking…' : 'Unlock dashboard'}</Button>
  </form>;
}
