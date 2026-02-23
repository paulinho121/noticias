
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
DECLARE
  v_user_org_id UUID;
BEGIN
  -- 1. Se for Master Admin, bypass total
  IF public.is_master_admin() THEN
    RETURN NEW;
  END IF;

  -- 2. Tentar obter a organização do contexto atual
  v_user_org_id := public.get_my_organization_strict();
  
  -- 3. Caso especial: Cadastro Inicial (Signup)
  -- Durante o trigger AFTER INSERT em auth.users, auth.uid() pode estar instável
  -- ou o mapeamento de organização ainda está sendo criado na mesma transação.
  IF v_user_org_id IS NULL AND NEW.organization_id IS NOT NULL THEN
    -- Se a ID da organização foi fornecida explicitamente (vinda de uma função SECURITY DEFINER como a de signup)
    -- e não temos um usuário logado (contexto de criação), permitimos o fluxo.
    IF auth.uid() IS NULL OR EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE user_id = auth.uid() AND organization_id = NEW.organization_id
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- 4. Forçar isolamento para usuários comuns
  IF v_user_org_id IS NOT NULL THEN
    NEW.organization_id := v_user_org_id;
  END IF;

  -- 5. Validação de Segurança
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'Acesso Negado: Organização não identificada para este usuário.';
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
