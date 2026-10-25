'use server';

import { uploadMedia } from '@/lib/admin-api';

/** Uploads an image file and returns its hosted URL, or null on failure. */
export async function uploadMediaAction(data: FormData): Promise<string | null> {
  try {
    const result = await uploadMedia(data);
    return result.url;
  } catch {
    return null;
  }
}
