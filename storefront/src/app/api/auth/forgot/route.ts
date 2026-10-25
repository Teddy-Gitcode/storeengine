import { API_BASE_URL, proxyJson } from "@/lib/server/customer-fetch";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const upstream = await fetch(`${API_BASE_URL}/auth/password/forgot/`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return proxyJson(upstream);
}
