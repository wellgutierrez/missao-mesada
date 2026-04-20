declare module "@supabase/ssr" {
  import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
  import type { SupabaseClient } from "@supabase/supabase-js";

  type CookieWrite = {
    name: string;
    value: string;
    options?: Partial<ResponseCookie>;
  };

  export function createBrowserClient(url: string, key: string): SupabaseClient;

  export function createServerClient(
    url: string,
    key: string,
    options: {
      cookies: {
        getAll(): unknown[];
        setAll(cookiesToSet: CookieWrite[]): void;
      };
    }
  ): SupabaseClient;
}