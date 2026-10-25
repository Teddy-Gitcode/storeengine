import { redirect } from 'next/navigation';

/* The template calls this Home Page Control; the storefront-slide manager at
   /content is the same screen, so this is its template-named route. */
export default function HomePageControlPage() {
  redirect('/content');
}
