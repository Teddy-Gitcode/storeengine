import { revalidatePath } from 'next/cache';
import { getReviews, approveReview, rejectReview, deleteReview } from '@/lib/admin-api';
import ReviewsClient from './ReviewsClient';

export const dynamic = 'force-dynamic';

async function approveAction(formData: FormData) {
  'use server';
  await approveReview(Number(formData.get('id')));
  revalidatePath('/products/review');
}

async function rejectAction(formData: FormData) {
  'use server';
  await rejectReview(Number(formData.get('id')));
  revalidatePath('/products/review');
}

async function deleteAction(formData: FormData) {
  'use server';
  await deleteReview(Number(formData.get('id')));
  revalidatePath('/products/review');
}

export default async function ReviewsPage() {
  const page = await getReviews({ page_size: 200 });
  const reviews = page.results;

  return (
    <ReviewsClient
      reviews={reviews}
      total={page.count}
      approveAction={approveAction}
      rejectAction={rejectAction}
      deleteAction={deleteAction}
    />
  );
}
