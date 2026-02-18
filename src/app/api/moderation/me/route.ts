import { NextRequest, NextResponse } from "next/server";
import { parseModerators, requireModerator } from "@/lib/moderationAuth";

export async function GET(req: NextRequest) {
  const auth = await requireModerator(req);
  if (!auth.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: auth.message,
        moderatorEmailsConfigured: parseModerators().length,
      },
      { status: auth.status },
    );
  }

  return NextResponse.json({
    ok: true,
    email: auth.email,
    moderatorEmailsConfigured: parseModerators().length,
  });
}
