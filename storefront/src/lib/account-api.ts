// Client-safe wrappers around the storefront's own /api/auth/* route handlers.
// The DRF token stays in an httpOnly cookie; these calls only see user data.

export type CustomerUser = {
  id: number;
  email: string;
  name: string;
  phone: string;
  marketing_opt_in: boolean;
};

export class ApiError extends Error {
  status: number;
  /** The password was right; the address has never been confirmed. A code has
   *  just been sent, so this is a detour rather than a refusal. */
  verificationRequired: boolean;
  email?: string;
  constructor(
    message: string,
    status: number,
    extra: { verificationRequired?: boolean; email?: string } = {},
  ) {
    super(message);
    this.status = status;
    this.verificationRequired = extra.verificationRequired === true;
    this.email = extra.email;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const body = data as { detail?: string; verification_required?: boolean; email?: string };
    throw new ApiError(body.detail || "Something went wrong.", response.status, {
      verificationRequired: body.verification_required === true,
      email: body.email,
    });
  }
  return data as T;
}

/** `remember` false keeps the session cookie for this browser session only. */
export function apiLogin(email: string, password: string, remember = true) {
  return request<{ user: CustomerUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, remember }),
  });
}

/** Creates the account and sends a code. No session comes back: the address
 *  has to answer first. */
export function apiRegister(payload: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  marketing_opt_in?: boolean;
}) {
  return request<{ detail: string; email: string; verification_required: boolean }>(
    "/api/auth/register",
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function apiGoogle(credential: string) {
  return request<{ user: CustomerUser }>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
}

export function apiLogout() {
  return request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}

export function apiMe() {
  return request<CustomerUser>("/api/auth/me");
}

export function apiUpdateMe(payload: { name?: string; phone?: string; marketing_opt_in?: boolean }) {
  return request<CustomerUser>("/api/auth/me", { method: "PATCH", body: JSON.stringify(payload) });
}

export function apiForgotPassword(email: string) {
  return request<{ detail: string }>("/api/auth/forgot", { method: "POST", body: JSON.stringify({ email }) });
}

export function apiResetPassword(payload: { uid: string; token: string; new_password: string }) {
  return request<{ detail: string }>("/api/auth/reset", { method: "POST", body: JSON.stringify(payload) });
}

/** Confirms an address with the code mailed to it, and signs them in.
 *  `orders_linked` counts guest orders that became visible as a result. */
export function apiVerifyEmail(payload: { email: string; code: string }) {
  return request<{
    detail: string;
    user: CustomerUser;
    orders_linked?: number;
    already?: boolean;
  }>("/api/auth/verify-email", { method: "POST", body: JSON.stringify(payload) });
}

export function apiResendVerification(email: string) {
  return request<{ detail: string }>("/api/auth/verify-email/resend", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/** Closes the account. The data itself is erased after a grace period. */
export function apiDeleteAccount() {
  return request<{ detail: string; erase_on: string }>("/api/account/delete", { method: "POST" });
}

/**
 * Downloads the customer's data as a file.
 *
 * Deliberately not a plain `<a href>`: the route handler needs the httpOnly
 * cookie *and* returns an error as JSON, so the response has to be inspected
 * before it becomes a download.
 */
export async function apiDownloadMyData(): Promise<void> {
  const response = await fetch("/api/account/export");
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new ApiError((data as { detail?: string }).detail || "Couldn't prepare your data.", response.status);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "my-data.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
