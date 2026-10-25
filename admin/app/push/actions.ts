'use server';

import { revalidatePath } from 'next/cache';
import { createPushCampaign } from '@/lib/admin-api';

export type CampaignInput = {
  name: string;
  title: string;
  body: string;
  image_url: string;
  link: string;
  audience: string;
  template_key: string;
  repeat: string;
  status: 'draft' | 'scheduled';
  scheduled_for: string | null;
};

/** Create a campaign from the composer. Errors come back as a string rather
 * than thrown, so the form can show the server's own validation message. */
export async function saveCampaign(input: CampaignInput) {
  if (!input.title.trim()) return { error: 'A notification title is required.' };
  if (!input.body.trim()) return { error: 'A message is required.' };

  // `scheduled_for` arrives already resolved to UTC by the composer. It has to
  // be converted there, in the browser: a `datetime-local` value carries no
  // timezone, and this action runs on the server, where `new Date()` would
  // resolve it as UTC and silently schedule every campaign by the admin's own
  // offset — three hours late for UTC+3.
  if (input.scheduled_for && Number.isNaN(Date.parse(input.scheduled_for))) {
    return { error: 'That send time could not be read. Pick it again.' };
  }

  try {
    await createPushCampaign(input);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not save the campaign.' };
  }
  revalidatePath('/push');
  return { error: null };
}
