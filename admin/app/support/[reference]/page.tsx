import { redirect } from 'next/navigation';

/* The ticket detail page is now a thread in the merged inbox. Notification
   emails and push payloads carry this URL, so it resolves rather than 404s. */
export default async function TicketPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  redirect(`/inbox?ticket=${encodeURIComponent(reference)}`);
}
