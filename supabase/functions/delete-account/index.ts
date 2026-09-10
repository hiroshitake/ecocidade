import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido." }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Não autenticado." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = authorization.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Serviço de conta não configurado." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser(token);

  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Sessão inválida." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return new Response(JSON.stringify({ error: "Não foi possível preparar a exclusão da conta." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (profile?.avatar_path) {
    const { error: avatarError } = await adminClient.storage
      .from("avatars")
      .remove([profile.avatar_path]);
    if (avatarError) {
      return new Response(JSON.stringify({ error: "Não foi possível remover a foto de perfil. A conta não foi excluída." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return new Response(JSON.stringify({ error: "Não foi possível excluir a conta." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, reports_preserved: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
