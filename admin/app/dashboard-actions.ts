'use server';

import { revalidatePath } from 'next/cache';
import { cancelOrder } from '@/lib/admin-api';

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Cancels an order (restocks items) and refreshes the dashboard. */
export async function cancelOrderAction(number: string): Promise<ActionResult> {
  try {
    await cancelOrder(number);
    revalidatePath('/');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not cancel this order. It may already be shipped or cancelled.' };
  }
}
