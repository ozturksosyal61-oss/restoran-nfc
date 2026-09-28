import { createClient } from "@supabase/supabase-js";

// Service role anahtarıyla çalışan istemci: RLS kurallarını ATLAR.
// Yalnızca sunucu kodunda ve yetki kontrolü yapıldıktan SONRA kullanın.
export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY tanımlı değil.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
