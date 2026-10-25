import type { Metadata } from "next";

/* What a link turns into when someone pastes it into a chat.
   Three things decide whether it becomes a card rather than a bare URL, and
   every page that wants one needs all three — which is why they are written
   once here rather than six times:

     * an absolute image. A crawler reading these tags has no origin to
       resolve a path against, so `publicMediaUrl` has to have been applied
       before the url reaches this function;
     * a description worth reading. A preview is a title, about two lines and
       a picture, so whatever matters most — a price, a count, what the page
       is for — belongs at the front of it;
     * summary_large_image, or the picture is a thumbnail beside the text
       rather than the card itself. Without an image there is nothing to make
       large, and the card falls back to `summary`.

   Pages that carry no image of their own are deliberately left alone: the
   site's own card is the right answer for /about, and a shop that put its
   logo on every category page would be back to one card for everything. */
export function shareCard(input: {
  title: string;
  description: string;
  siteName?: string;
  /** Already absolute. Omitted when the page has no image worth showing. */
  image?: string;
}): Pick<Metadata, "openGraph" | "twitter"> {
  const { title, description, siteName, image } = input;
  return {
    openGraph: {
      title,
      description,
      siteName,
      type: "website",
      images: image ? [{ url: image, alt: title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}
