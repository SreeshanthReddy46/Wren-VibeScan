const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Client-side cache for Supabase instance
let cachedClient: unknown = null;

export async function getSupabaseClient() {
  if (typeof window === "undefined") {
    // Never instantiate or import @supabase/supabase-js during server-side rendering (SSR)
    return null;
  }
  if (!isSupabaseConfigured) {
    return null;
  }
  if (cachedClient) {
    return cachedClient;
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    cachedClient = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return cachedClient;
  } catch (err) {
    console.warn("Failed to load Supabase client:", err);
    return null;
  }
}

export async function signInWithGoogleOAuth(): Promise<{ error: Error | null }> {
  const client = (await getSupabaseClient()) as {
    auth: {
      signInWithOAuth: (options: unknown) => Promise<{ error: { message: string } | null }>;
    };
  } | null;

  if (client) {
    const { error } = await client.auth.signInWithOAuth({
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

  // Secure Mock Fallback for local development / demo mode
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
  const client = (await getSupabaseClient()) as {
    auth: {
      signInWithOAuth: (options: unknown) => Promise<{ error: { message: string } | null }>;
    };
  } | null;

  if (client) {
    const { error } = await client.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/dashboard`,
      },
    });
    return { error: error ? new Error(error.message) : null };
  }

  // Secure Mock Fallback for local development / demo mode
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
