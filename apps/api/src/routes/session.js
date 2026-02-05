import { supabase } from "../config/supabase.js";
import { createSessionToken } from "../utils/token.js";

export async function createSession(req, res) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ expires_at: expiresAt })
    .select()
    .single();

  if (error) {
  console.error("❌ Supabase session insert error:", error);
  return res.status(500).json({
    error: error.message,
    details: error.details,
    hint: error.hint
  });
}


  const token = createSessionToken(data.id);

  res.json({
    token,
    expiresAt
  });
}
