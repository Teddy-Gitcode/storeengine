import { NextResponse } from "next/server";
import { customerFetch, getCustomerToken } from "@/lib/server/customer-fetch";

/**
 * GDPR Art. 20 — hand the customer their data as a file.
 *
 * Streamed straight through rather than parsed and re-serialised: the browser
 * gets the same bytes Django produced, and the filename Django chose, so the
 * download is one copy of the truth rather than this route's idea of it.
 */
export async function GET() {
  if (!(await getCustomerToken())) {
    return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  }

  const upstream = await customerFetch("/auth/me/export/");
  if (!upstream.ok) {
    return NextResponse.json(
      { detail: "Couldn't prepare your data right now. Please try again." },
      { status: upstream.status }
    );
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition":
        upstream.headers.get("content-disposition") ?? 'attachment; filename="my-data.json"',
      "Cache-Control": "no-store",
    },
  });
}
