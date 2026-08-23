import { useState } from "react";
import { useAuth } from "../context/AuthProvider";

export function Login() {
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-orange-100 p-8 text-center">
        <div className="text-5xl mb-2">🍴</div>
        <h1 className="text-2xl font-extrabold text-stone-800">Culinary Quest</h1>
        <p className="text-stone-500 mt-1 mb-6">
          A gamified date-night planner for couples. Discover, rate, and quest through your favorite
          restaurants together.
        </p>
        <button
          onClick={() => signInWithGoogle().catch((e) => setError(e.message))}
          className="w-full flex items-center justify-center gap-2 border border-stone-300 rounded-xl px-4 py-3 font-semibold text-stone-700 hover:bg-stone-50"
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.7 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4c-7.6 0-14.1 4.3-17.4 10.7z" />
            <path fill="#4CAF50" d="M24 44c5.3 0 10.2-2 13.9-5.4l-6.4-5.4C29.4 34.9 26.8 36 24 36c-5.4 0-9.9-3.3-11.4-7.9l-6.5 5C9.8 39.6 16.4 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 3-3.4 5.5-6.4 6.7v.1l6.4 5.4C37.9 41.2 44 36 44 24c0-1.3-.1-2.7-.4-3.5z" />
          </svg>
          Continue with Google
        </button>

        <div className="my-4 flex items-center gap-3 text-xs text-stone-400">
          <div className="flex-1 h-px bg-stone-200" />
          or
          <div className="flex-1 h-px bg-stone-200" />
        </div>

        {sent ? (
          <p className="text-sm text-emerald-600">Check your email for a magic sign-in link!</p>
        ) : (
          <form
            className="flex flex-col gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              try {
                await signInWithEmail(email);
                setSent(true);
              } catch (err: any) {
                setError(err.message);
              }
            }}
          >
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-stone-300 rounded-xl px-4 py-3 text-sm"
            />
            <button
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-4 py-3"
            >
              Email me a sign-in link
            </button>
          </form>
        )}

        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}

        <p className="text-[11px] text-stone-400 mt-6">
          Google sign-in requires the site owner to enable the Google provider in Supabase Auth settings.
        </p>
      </div>
    </div>
  );
}
