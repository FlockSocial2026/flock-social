import { NextRequest } from "next/server";
import { getSupabaseAnonServer } from "@/lib/supabaseAdmin";

export async function requireAuth(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return { ok: false as const, status: 401, message: "Missing bearer token" };

  const anon = getSupabaseAnonServer();
  const { data, error } = await anon.auth.getUser(token);

  if (error || !data.user) {
    return { ok: false as const, status: 401, message: "Invalid auth token" };
  }

  return { ok: true as const, user: data.user, token };
}
