import type { ProductVideoInfo } from "@/lib/types";
import { ArrowUpRight } from "lucide-react";

/**
 * Extracts a YouTube video id from any common URL shape:
 * youtu.be/<id>, youtube.com/watch?v=<id>, /shorts/<id>, /embed/<id>.
 * Query params like ?si= are ignored. Returns null for non-YouTube URLs.
 */
export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      const match = u.pathname.match(/^\/(shorts|embed|live)\/([\w-]{6,})/);
      if (match) return match[2];
    }
  } catch {
    /* not a URL */
  }
  return null;
}

/** Product videos, embedded in-page: YouTube via iframe, direct files via <video>. */
export default function ProductVideos({ videos }: { videos: ProductVideoInfo[] }) {
  const playable = videos.filter((v) => v.url);
  if (!playable.length) return null;

  return (
    <section className="container-store pt-2 pb-4">
      <h2 className="text-[15px] font-semibold text-ink mb-3">Videos</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl">
        {playable.map((video, i) => {
          const id = youtubeId(video.url);
          return (
            <figure key={`${video.url}-${i}`} className="rounded-xl overflow-hidden bg-black/5">
              <div className="relative aspect-video">
                {id ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${id}`}
                    title={video.title || "Product video"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    loading="lazy"
                    className="absolute inset-0 h-full w-full border-0"
                  />
                ) : /\.(mp4|webm|mov)(\?|$)/i.test(video.url) ? (
                  <video
                    src={video.url}
                    poster={video.thumbnail || undefined}
                    controls
                    preload="metadata"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 flex items-center justify-center gap-1 text-[13px] font-semibold text-brand hover:underline"
                  >
                    Watch video <ArrowUpRight size={14} aria-hidden />
                  </a>
                )}
              </div>
              {video.title && (
                <figcaption className="px-3 py-2 text-[12.5px] text-ink-muted">{video.title}</figcaption>
              )}
            </figure>
          );
        })}
      </div>
    </section>
  );
}
