import { redirect } from 'next/navigation';

/* Support and Inbox were two views of one dataset — see app/inbox/page.tsx.
   The route stays so existing links, bookmarks and notification payloads keep
   working. */
export default function SupportPage() {
  redirect('/inbox');
}
