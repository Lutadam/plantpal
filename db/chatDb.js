import { supabase } from "../supabase/config";

export async function getChatMessages(userId, plantId) {
  let query = supabase
    .from("chat_messages")
    .select("*")
    .eq("userId", userId)
    .order("createdAt", { ascending: true });
  query = plantId ? query.eq("plantId", plantId) : query.is("plantId", null);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function addChatMessage(userId, plantId, role, content) {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ userId, plantId: plantId ?? null, role, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteChatMessages(userId, plantId) {
  let query = supabase.from("chat_messages").delete().eq("userId", userId);
  query = plantId ? query.eq("plantId", plantId) : query.is("plantId", null);

  const { error } = await query;
  if (error) throw error;
}
