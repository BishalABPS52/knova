// lib/api-client.ts


const getErrorMessage = async (response: Response) => {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      const data = await response.json();
      if (typeof data === "string") return data;
      if (typeof data?.detail === "string") return data.detail;
      if (Array.isArray(data?.detail)) {
        const firstDetail = data.detail[0];
        if (typeof firstDetail?.msg === "string") return firstDetail.msg;
      }
      return JSON.stringify(data);
    } catch {
      // fall back to text below
    }
  }

  const text = await response.text();
  return text || `Request failed with status ${response.status}`;
};

const API_PORT = process.env.NEXT_PUBLIC_API_PORT || "8000";

// Requests can't hang forever: the session bootstrap (GET /users/me) gates the
// whole app, so an unreachable API has to fail rather than stall.
const REQUEST_TIMEOUT_MS = 15_000;

export const getApiUrl = () => {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/+$/, "");

  // When the page is opened from another device (a phone on the same network),
  // "localhost" is that device — not the machine running the API. Reuse the host
  // the page itself was served from so LAN testing works without extra config.
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:${API_PORT}`;
  }

  return `http://localhost:${API_PORT}`;
};

// AbortSignal.timeout is unavailable on older mobile Safari; skip the timeout
// there rather than throwing while building the request.
const timeoutSignal = () =>
  typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
    ? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    : undefined;

const isNetworkError = (error: Error) =>
  error.name === "TimeoutError" ||
  error.name === "AbortError" ||
  error.message.includes("Failed to fetch") ||
  error.message.includes("fetch");

// Auth endpoints must never trigger the refresh-and-retry flow (a 401 from them is
// a genuine auth failure, and refreshing on /auth/refresh would recurse).
const AUTH_PATHS = [
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
  "/api/v1/auth/logout",
];

// A single in-flight refresh shared by every request that 401s at the same time,
// so an expired access token triggers exactly one /auth/refresh, not one per call.
let refreshPromise: Promise<boolean> | null = null;

const refreshSession = (): Promise<boolean> => {
  if (!refreshPromise) {
    refreshPromise = fetch(`${getApiUrl()}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      signal: timeoutSignal(),
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

export const api = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const apiUrl = getApiUrl();

  const doFetch = () =>
    fetch(`${apiUrl}${path}`, {
      credentials: "include",
      signal: timeoutSignal(),
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

  try {
    let response = await doFetch();

    // Transparent access-token renewal: on a 401 (expired access token), try a
    // single refresh using the refresh-token cookie, then replay the request once.
    if (response.status === 401 && !AUTH_PATHS.some((p) => path.startsWith(p))) {
      const refreshed = await refreshSession();
      if (refreshed) {
        response = await doFetch();
      }
    }

    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      if (isNetworkError(error)) {
        throw new Error(
          `Unable to reach the server at ${apiUrl}. Check your connection and that the API is running.`,
        );
      }
      if (error.message) throw error;
    }

    throw new Error("Unexpected request error");
  }
};
