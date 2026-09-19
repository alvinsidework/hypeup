import { graphVersion } from "@/lib/hypeup/env.server";
import { InstagramApiError } from "./errors";

const GRAPH_HOST = "https://graph.instagram.com";
const TIMEOUT_MS = 12_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text.slice(0, 400) };
  }
}

function asError(payload: unknown, status: number): InstagramApiError {
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const error = record.error && typeof record.error === "object" ? (record.error as Record<string, unknown>) : record;
  const message =
    (typeof error.message === "string" && error.message) ||
    (typeof error.error_message === "string" && error.error_message) ||
    (typeof record.error_message === "string" && record.error_message) ||
    `Instagram API ${status}`;
  const code = typeof error.code === "number" ? error.code : undefined;
  const subcode = typeof error.error_subcode === "number" ? error.error_subcode : undefined;
  return new InstagramApiError(message, { status, code, subcode, raw: payload });
}

async function igFetch(url: string, init: RequestInit, token?: string): Promise<unknown> {
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const run = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, headers, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  let res = await run();
  if (res.status === 429) {
    await sleep(800);
    res = await run();
  }
  const payload = await parseJson(res);
  if (!res.ok) throw asError(payload, res.status);
  return payload;
}

function graphUrl(path: string, search: Record<string, string> = {}, token?: string) {
  const url = new URL(`${GRAPH_HOST}/${graphVersion()}${path.startsWith("/") ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(search)) {
    if (value) url.searchParams.set(key, value);
  }
  if (token) url.searchParams.set("access_token", token);
  return url;
}

export async function graphGet<T>(token: string, path: string, search: Record<string, string> = {}): Promise<T> {
  return (await igFetch(graphUrl(path, search, token).toString(), { method: "GET" }, token)) as T;
}

export async function graphPost<T>(
  token: string,
  path: string,
  body?: unknown,
  search: Record<string, string> = {},
): Promise<T> {
  const url = graphUrl(path, search, token);
  return (await igFetch(
    url.toString(),
    { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) },
    token,
  )) as T;
}

export async function graphDelete<T>(token: string, path: string): Promise<T> {
  return (await igFetch(graphUrl(path, {}, token).toString(), { method: "DELETE" }, token)) as T;
}

export async function graphRawGet<T>(url: string, token?: string): Promise<T> {
  return (await igFetch(url, { method: "GET" }, token)) as T;
}

export async function formPost<T>(url: string, form: Record<string, string>): Promise<T> {
  const body = new URLSearchParams(form);
  return (await igFetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  })) as T;
}
