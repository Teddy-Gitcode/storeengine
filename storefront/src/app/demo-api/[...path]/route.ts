// Demo: the browser's API requests, answered from the bundled fixtures.
import { demoApi } from "@/demo/demo-api";

export const dynamic = "force-dynamic";

async function handle(request: Request) {
  const body = request.method === "GET" || request.method === "HEAD" ? null : await request.text();
  return demoApi(request.method, request.url, request.headers, body);
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
