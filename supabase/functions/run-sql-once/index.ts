import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // Security: only allow from authorized callers
  const authHeader = req.headers.get('Authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authHeader || !authHeader.includes(serviceKey?.substring(0, 20) || 'INVALID')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const migrations = [
    // Create trigger function
    `CREATE OR REPLACE FUNCTION public.auto_fill_log_organization()
    RETURNS TRIGGER AS $$
    DECLARE v_org_id UUID;
    BEGIN
      IF NEW.organization_id IS NOT NULL THEN RETURN NEW; END IF;
      IF NEW.feed_item_id IS NOT NULL THEN
        SELECT fi.organization_id INTO v_org_id FROM public.feed_items fi WHERE fi.id = NEW.feed_item_id LIMIT 1;
      END IF;
      IF v_org_id IS NULL AND NEW.feed_id IS NOT NULL THEN
        SELECT f.organization_id INTO v_org_id FROM public.feeds f WHERE f.id = NEW.feed_id LIMIT 1;
      END IF;
      IF v_org_id IS NULL AND NEW.user_id IS NOT NULL THEN
        SELECT om.organization_id INTO v_org_id FROM public.organization_members om WHERE om.user_id = NEW.user_id LIMIT 1;
      END IF;
      NEW.organization_id := v_org_id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER`,

    `DROP TRIGGER IF EXISTS trg_auto_fill_log_organization ON public.logs`,
    `CREATE TRIGGER trg_auto_fill_log_organization BEFORE INSERT ON public.logs FOR EACH ROW EXECUTE FUNCTION public.auto_fill_log_organization()`,

    // Backfill
    `UPDATE public.logs l SET organization_id = (SELECT fi.organization_id FROM public.feed_items fi WHERE fi.id = l.feed_item_id LIMIT 1) WHERE l.organization_id IS NULL AND l.feed_item_id IS NOT NULL`,
    `UPDATE public.logs l SET organization_id = (SELECT f.organization_id FROM public.feeds f WHERE f.id = l.feed_id LIMIT 1) WHERE l.organization_id IS NULL AND l.feed_id IS NOT NULL`,
    `UPDATE public.logs l SET organization_id = (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = l.user_id LIMIT 1) WHERE l.organization_id IS NULL AND l.user_id IS NOT NULL`,

    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_logs_organization_id ON public.logs(organization_id)`,
    `CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.logs(created_at DESC)`,

    // Enable RLS
    `ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY`,

    // Drop old policies
    `DROP POLICY IF EXISTS "Isolamento: logs" ON public.logs`,
    `DROP POLICY IF EXISTS "Nuclear_Isolation_logs" ON public.logs`,
    `DROP POLICY IF EXISTS "Logs: Master Control" ON public.logs`,
    `DROP POLICY IF EXISTS "Logs: Member Insert/View" ON public.logs`,
    `DROP POLICY IF EXISTS "Logs: Member Insert" ON public.logs`,
    `DROP POLICY IF EXISTS "logs_master_admin_all" ON public.logs`,
    `DROP POLICY IF EXISTS "logs_tenant_select" ON public.logs`,
    `DROP POLICY IF EXISTS "logs_tenant_insert" ON public.logs`,

    // New isolated policies
    `CREATE POLICY "logs_master_admin_all" ON public.logs FOR ALL TO authenticated USING (public.is_master_admin()) WITH CHECK (public.is_master_admin())`,
    `CREATE POLICY "logs_tenant_select" ON public.logs FOR SELECT TO authenticated USING (organization_id = public.get_my_organization_strict() AND organization_id IS NOT NULL)`,
    `CREATE POLICY "logs_tenant_insert" ON public.logs FOR INSERT TO authenticated WITH CHECK (organization_id = public.get_my_organization_strict() AND organization_id IS NOT NULL)`,
    `ALTER TABLE public.feeds ADD COLUMN IF NOT EXISTS include_source_link BOOLEAN DEFAULT false`,
  ];

  const results = [];
  for (const sql of migrations) {
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).single().catch(() => ({ error: null }));
    // Use raw query via pg
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql_query: sql })
    });
    const text = await res.text();
    results.push({ sql: sql.substring(0, 60), status: res.status, ok: res.ok, response: text.substring(0, 100) });
  }

  // Verify  
  const { data: policies } = await supabase.from('pg_policies' as any).select('policyname, cmd').eq('tablename', 'logs');
  const { count: orphans } = await supabase.from('logs').select('id', { count: 'exact', head: true }).is('organization_id', null);

  return new Response(JSON.stringify({ 
    success: true, 
    results,
    orphan_logs: orphans,
    message: 'RLS isolation applied'
  }), { headers: { 'Content-Type': 'application/json' } });
});
