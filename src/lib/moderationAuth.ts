import { NextRequest } from "next/server";
import { getSupabaseAnonServer } from "@/lib/supabaseAdmin";

export const parseModerators = () =>
  (process.env.MODERATOR_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export async function requireModerator(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return { ok: false as const, status: 401, message: "Missing bearer token" };

  const anon = getSupabaseAnonServer();
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user?.email) {
    return { ok: false as const, status: 401, message: "Invalid auth token" };
  }

  const moderators = parseModerators();
  const email = data.user.email.toLowerCase();
  if (!moderators.includes(email)) {
    return { ok: false as const, status: 403, message: "Not authorized for moderation" };
  }

  return { ok: true as const, userId: data.user.id, email };
}
