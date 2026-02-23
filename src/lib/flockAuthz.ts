import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type ChurchRole = "member" | "group_leader" | "pastor_staff" | "church_admin";

export async function getMyChurchMembership(userId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("church_memberships")
    .select("id,church_id,role")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as { id: string; church_id: string; role: ChurchRole } | null;
}

export function canPublish(role: ChurchRole) {
  return role === "pastor_staff" || role === "church_admin";
}

export function capabilityMap(role: ChurchRole) {
  return {
    publishAnnouncements: canPublish(role),
    createEvents: canPublish(role),
    assignRoles: role === "church_admin",
  };
}
