const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Configure as variáveis de ambiente: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const userIds = process.argv.slice(2);

if (!userIds.length) {
  console.error('Use: node scripts/delete-supabase-users.js <user-id-1> <user-id-2>');
  process.exit(1);
}

(async () => {
  for (const userId of userIds) {
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error(`Erro ao excluir usuário ${userId}:`, error.message || error);
      continue;
    }

    console.log(`Usuário excluído com sucesso: ${userId}`);
    if (data?.user) {
      console.log('Dados retornados:', JSON.stringify(data.user, null, 2));
    }
  }
})();
