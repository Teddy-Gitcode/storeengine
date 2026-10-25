import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getBrand, updateBrand } from '@/lib/admin-api';
import BrandForm from '@/components/sellzy/brand-form';
import { brandErrorMessage, brandPayload } from '../../brand-payload';

export const dynamic = 'force-dynamic';

export default async function EditBrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const brand = await getBrand(slug).catch(() => null);
  if (!brand) notFound();

  async function updateAction(formData: FormData) {
    'use server';
    const payload = brandPayload(formData);
    if (!payload) return { error: 'Brand name is required.' };
    try {
      await updateBrand(slug, payload);
    } catch (err) {
      return { error: brandErrorMessage(err) };
    }
    revalidatePath('/categories/brands');
    revalidatePath(`/categories/brands/${slug}/edit`);
    redirect('/categories/brands');
  }

  return <BrandForm brand={brand} action={updateAction} />;
}
