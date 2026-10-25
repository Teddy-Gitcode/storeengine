/* Demo: answer the API from bundled fixtures instead of the network.
 * See demo/server-fetch.ts. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { installDemoFetch } = await import("./demo/server-fetch");
  installDemoFetch();
}
