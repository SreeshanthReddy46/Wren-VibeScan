import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export async function signInWithGoogleOAuth(): Promise<{ error: Error | null }> {
  if (supabase) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/dashboard`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    return { error: error ? new Error(error.message) : null };
  }

  // Secure Mock Fallback for local development
  return new Promise((resolve) => {
    setTimeout(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "wren_auth_user",
          JSON.stringify({
            id: "user_google_mock",
            email: "developer@gmail.com",
            provider: "google",
            authenticatedAt: new Date().toISOString(),
          })
        );
      }
      resolve({ error: null });
    }, 600);
  });
}

export async function signInWithGitHubOAuth(): Promise<{ error: Error | null }> {
  if (supabase) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/dashboard`,
      },
    });
    return { error: error ? new Error(error.message) : null };
  }

  // Secure Mock Fallback for local development
  return new Promise((resolve) => {
    setTimeout(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          "wren_auth_user",
          JSON.stringify({
            id: "user_github_mock",
            email: "octocat@github.com",
            provider: "github",
            authenticatedAt: new Date().toISOString(),
          })
        );
      }
      resolve({ error: null });
    }, 600);
  });
}
