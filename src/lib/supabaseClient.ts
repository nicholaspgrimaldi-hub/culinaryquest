import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!url || !key) {
  // eslint-disable-next-line no-console
  console.error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY env vars. See .env.example."
  );
}

export const supabase = createClient(url, key);

export async function callEdgeFunction<T = any>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // supabase-js's FunctionsHttpError.message is just "Edge Function returned a
    // non-2xx status code" — the actual reason lives in error.context, which is
    // the raw Response from the function. Try to pull the real message out of it.
    const context = (error as any).context;
    let realMessage: string | null = null;
    if (context && typeof context.json === "function") {
      try {
        const parsed = await context.clone().json();
        if (parsed?.error) realMessage = parsed.error;
      } catch {
        // response body wasn't JSON (or already consumed) — fall through
      }
    }
    throw new Error(realMessage ?? error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}
