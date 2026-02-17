"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  targetType: "post" | "comment" | "user";
  postId?: string;
  commentId?: string;
  userId?: string;
};

export default function ReportButton({ targetType, postId, commentId, userId }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async () => {
    const text = reason.trim();
    if (text.length < 5) return setMsg("Reason must be at least 5 characters.");

    const { data: userData } = await supabase.auth.getUser();
    const me = userData.user;
    if (!me) return setMsg("Please login again.");

    const payload: any = {
      reporter_id: me.id,
      target_type: targetType,
      reason: text,
    };

    if (postId) payload.target_post_id = postId;
    if (commentId) payload.target_comment_id = commentId;
    if (userId) payload.target_user_id = userId;

    const { error } = await supabase.from("reports").insert(payload);
    if (error) return setMsg(`Report failed: ${error.message}`);

    setMsg("Report submitted.");
    setReason("");
    setTimeout(() => setOpen(false), 700);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ opacity: 0.8 }}>
        Report
      </button>
    );
  }

  return (
    <div style={{ border: "1px solid #555", borderRadius: 8, padding: 8, marginTop: 6 }}>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Why are you reporting this?"
        rows={3}
        maxLength={500}
        style={{ width: "100%", padding: 8, marginBottom: 6 }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={submit}>Submit Report</button>
        <button onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {msg ? <p style={{ marginTop: 6 }}>{msg}</p> : null}
    </div>
  );
}
