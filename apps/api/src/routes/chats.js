import { supabase } from "../config/supabase.js";
import { requireSession } from "../middleware/sessionAuth.js";

export async function getChats(req, res) {
  const sessionId = req.sessionId;

  const { data } = await supabase
    .from("chats")
    .select("role,message,created_at")
    .eq("session_id", sessionId)
    .order("created_at");

  res.json(data || []);
}
