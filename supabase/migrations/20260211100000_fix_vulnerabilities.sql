-- ========================================================
-- CORREÇÃO DE VULNERABILIDADES DE SEGURANÇA (RLS)
-- Tabelas afetadas: plans, subscriptions, usage_stats, audit_logs
-- ========================================================

-- 0. Garantir que a função de limpeza de políticas exista
CREATE OR REPLACE FUNCTION public.clean_policies(t_name text) RETURNS void AS $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = t_name AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 1. Garantir que as tabelas tenham a estrutura correta para isolamento
DO $$ 
BEGIN
  -- audit_logs (Se existir)
  IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='audit_logs' AND TABLE_SCHEMA='public') THEN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='audit_logs' AND COLUMN_NAME='organization_id') THEN
      ALTER TABLE public.audit_logs ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    END IF;
  END IF;

  -- usage_stats
  IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='usage_stats' AND TABLE_SCHEMA='public') THEN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='usage_stats' AND COLUMN_NAME='organization_id') THEN
      ALTER TABLE public.usage_stats ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    END IF;
  END IF;

  -- subscriptions
  IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='subscriptions' AND TABLE_SCHEMA='public') THEN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='subscriptions' AND COLUMN_NAME='organization_id') THEN
      ALTER TABLE public.subscriptions ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    END IF;
  END IF;
END $$;

-- 2. Habilitar RLS em todas as tabelas vulneráveis
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='plans' AND TABLE_SCHEMA='public') THEN
    ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='subscriptions' AND TABLE_SCHEMA='public') THEN
    ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='usage_stats' AND TABLE_SCHEMA='public') THEN
    ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='audit_logs' AND TABLE_SCHEMA='public') THEN
    ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 3. Limpar políticas antigas (para evitar conflitos)
SELECT public.clean_policies('plans');
SELECT public.clean_policies('subscriptions');
SELECT public.clean_policies('usage_stats');
SELECT public.clean_policies('audit_logs');

-- 4. Aplicar Novas Políticas de Segurança

-- PLANS (Global)
-- Todos os usuários autenticados podem ver os planos disponíveis
CREATE POLICY "Plans: Ver planos" ON public.plans FOR SELECT TO authenticated USING (true);
-- Apenas Master Admin pode gerenciar planos
CREATE POLICY "Plans: Master gerencia" ON public.plans FOR ALL TO authenticated USING (public.is_master_admin());

-- SUBSCRIPTIONS (Isolamento por Organização)
CREATE POLICY "Subscriptions: Ver própria" ON public.subscriptions FOR SELECT TO authenticated 
USING (organization_id = public.get_my_organization() OR public.is_master_admin());

CREATE POLICY "Subscriptions: Master tudo" ON public.subscriptions FOR ALL TO authenticated 
USING (public.is_master_admin());

-- USAGE STATS (Isolamento por Organização)
CREATE POLICY "Usage: Ver próprio" ON public.usage_stats FOR SELECT TO authenticated 
USING (organization_id = public.get_my_organization() OR public.is_master_admin());

CREATE POLICY "Usage: Master tudo" ON public.usage_stats FOR ALL TO authenticated 
USING (public.is_master_admin());

-- AUDIT LOGS (Apenas Master Admin por padrão, ou por org se disponível)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='audit_logs' AND TABLE_SCHEMA='public') THEN
    EXECUTE 'CREATE POLICY "Audit: Ver próprio" ON public.audit_logs FOR SELECT TO authenticated 
             USING (organization_id = public.get_my_organization() OR public.is_master_admin())';
    
    EXECUTE 'CREATE POLICY "Audit: Master tudo" ON public.audit_logs FOR ALL TO authenticated 
             USING (public.is_master_admin())';
  END IF;
END $$;
