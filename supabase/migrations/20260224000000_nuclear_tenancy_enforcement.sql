
-- ========================================================
-- NUCLEAR TENANCY ENFORCEMENT (ISOLAMENTO DE ELITE)
-- ========================================================

-- 1. Função de Identidade Ultra-Segura
CREATE OR REPLACE FUNCTION public.get_my_organization_strict()
RETURNS UUID AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Tenta pegar do cache da sessão primeiro (performance)
  v_org_id := current_setting('app.current_organization_id', true)::UUID;
  
  IF v_org_id IS NULL THEN
    -- Busca no mapeamento de membros
    SELECT organization_id INTO v_org_id 
    FROM public.organization_members 
    WHERE user_id = auth.uid() 
    LIMIT 1;
  END IF;
  
  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Garantir que o Gatilho de Auto-Injeção existe
CREATE OR REPLACE FUNCTION public.trg_enforce_tenant_isolation()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o usuário não for Master Admin, forçamos o organization_id dele
  IF NOT public.is_master_admin() THEN
    NEW.organization_id := public.get_my_organization_strict();
    
    -- Se ainda for nulo, o usuário não tem organização e não pode criar nada
    IF NEW.organization_id IS NULL THEN
      RAISE EXCEPTION 'Usuário não vinculado a nenhuma organização ativa.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Aplicar Isolamento em tabelas críticas que podem estar vulneráveis
DO $$
DECLARE
  t_name TEXT;
  tables_to_isolate TEXT[] := ARRAY[
    'feeds', 'feed_items', 'schedules', 'logs', 
    'support_tickets', 'ticket_comments', 'white_label_settings',
    'usage_stats', 'categories'
  ];
BEGIN
  FOREACH t_name IN ARRAY tables_to_isolate LOOP
    -- A) Garantir coluna
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id)', t_name);
    
    -- B) Ativar RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);
    
    -- C) Criar Trigger de Injeção Automática (Proteção contra erro humano)
    EXECUTE format('DROP TRIGGER IF EXISTS trg_auto_tenant_isolation ON public.%I', t_name);
    EXECUTE format('CREATE TRIGGER trg_auto_tenant_isolation 
                    BEFORE INSERT ON public.%I 
                    FOR EACH ROW EXECUTE FUNCTION public.trg_enforce_tenant_isolation()', t_name);
                    
    -- D) Aplicar Política Nuclear (USING e CHECK)
    EXECUTE format('DROP POLICY IF EXISTS "Nuclear_Isolation_%s" ON public.%I', t_name, t_name);
    EXECUTE format('CREATE POLICY "Nuclear_Isolation_%s" ON public.%I 
                    FOR ALL TO authenticated 
                    USING (organization_id = public.get_my_organization_strict() OR public.is_master_admin())
                    WITH CHECK (organization_id = public.get_my_organization_strict() OR public.is_master_admin())', t_name, t_name);
  END LOOP;
END $$;

-- 4. Proteção da própria tabela de Organização
DROP POLICY IF EXISTS "Orgs_Self_Isolation" ON public.organizations;
CREATE POLICY "Orgs_Self_Isolation" ON public.organizations
  FOR SELECT TO authenticated
  USING (id = public.get_my_organization_strict() OR public.is_master_admin());
