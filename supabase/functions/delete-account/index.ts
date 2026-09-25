import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

async function collectFiles(storage: ReturnType<typeof createClient>["storage"], bucketId: string, prefix = ""): Promise<string[]> {
  const files: string[] = [];
  const { data, error } = await storage.from(bucketId).list(prefix, { limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } });
  if (error) throw error;
  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (!item.metadata) files.push(...await collectFiles(storage, bucketId, path)); else files.push(path);
  }
  return files;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Método não permitido." }), { status: 405, headers: jsonHeaders });
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Não autenticado." }), { status: 401, headers: jsonHeaders });
  const token = authorization.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return new Response(JSON.stringify({ error: "Serviço de conta não configurado." }), { status: 500, headers: jsonHeaders });
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user) return new Response(JSON.stringify({ error: "Sessão inválida." }), { status: 401, headers: jsonHeaders });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { data: buckets, error: bucketsError } = await adminClient.storage.listBuckets();
    if (bucketsError) throw bucketsError;
    for (const bucket of buckets ?? []) {
      const files = await collectFiles(adminClient.storage, bucket.id);
      const userFiles = files.filter((path) => path.startsWith(`${user.id}/`) || path.includes(`/${user.id}/`) || path.startsWith(`reports/${user.id}/`) || path.startsWith(`avatars/${user.id}/`));
      if (userFiles.length > 0) {
        const { error: removeError } = await adminClient.storage.from(bucket.id).remove(userFiles);
        if (removeError) throw removeError;
      }
    }
    const userClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
    const { error: deleteError } = await userClient.rpc("delete_current_user");
    if (deleteError) throw deleteError;
    return new Response(JSON.stringify({ success: true, reports_preserved: true }), { status: 200, headers: jsonHeaders });
  } catch (error) {
    console.error("delete-account error:", error);
    return new Response(JSON.stringify({ error: "Não foi possível excluir a conta.", detail: error instanceof Error ? error.message : String(error) }), { status: 500, headers: jsonHeaders });
  }
});