import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createBrand } from '@/lib/admin-api';
import BrandForm from '@/components/sellzy/brand-form';
import { brandErrorMessage, brandPayload } from '../brand-payload';

export const dynamic = 'force-dynamic';

async function createAction(formData: FormData) {
  'use server';
  const payload = brandPayload(formData);
  if (!payload) return { error: 'Brand name is required.' };
  try {
    await createBrand(payload);
  } catch (err) {
    return { error: brandErrorMessage(err) };
  }
  revalidatePath('/categories/brands');
  redirect('/categories/brands');
}

export default function AddBrandPage() {
  return <BrandForm action={createAction} />;
}
