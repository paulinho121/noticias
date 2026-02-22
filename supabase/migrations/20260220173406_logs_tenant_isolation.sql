-- ================================================================
-- LOGS TENANT ISOLATION: Garantia de isolamento total por tenant
-- Cada organização só vê seus próprios logs. Nunca logs de outros.
-- ================================================================

-- 1. Garantir que a coluna organization_id existe e tem índice
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'logs' AND column_name = 'organization_id' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.logs ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Índice para performance em queries por tenant
CREATE INDEX IF NOT EXISTS idx_logs_organization_id ON public.logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON public.logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.logs(created_at DESC);

-- 2. Trigger: preenche organization_id automaticamente ao inserir um log
--    Assim mesmo que a Edge Function esqueça de passar o campo, ele é preenchido.
CREATE OR REPLACE FUNCTION public.auto_fill_log_organization()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Se já tem org_id, não mexer
  IF NEW.organization_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Tentar pegar via feed_item
  IF NEW.feed_item_id IS NOT NULL THEN
    SELECT fi.organization_id INTO v_org_id
    FROM public.feed_items fi
    WHERE fi.id = NEW.feed_item_id
    LIMIT 1;
  END IF;

  -- Tentar pegar via feed
  IF v_org_id IS NULL AND NEW.feed_id IS NOT NULL THEN
    SELECT f.organization_id INTO v_org_id
    FROM public.feeds f
    WHERE f.id = NEW.feed_id
    LIMIT 1;
  END IF;

  -- Tentar pegar via user_id
  IF v_org_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT om.organization_id INTO v_org_id
    FROM public.organization_members om
    WHERE om.user_id = NEW.user_id
    LIMIT 1;
  END IF;

  NEW.organization_id := v_org_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_fill_log_organization ON public.logs;
CREATE TRIGGER trg_auto_fill_log_organization
  BEFORE INSERT ON public.logs
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_fill_log_organization();

-- 3. Backfill: preencher logs existentes que não têm organization_id
UPDATE public.logs l
SET organization_id = (
  SELECT fi.organization_id
  FROM public.feed_items fi
  WHERE fi.id = l.feed_item_id
  LIMIT 1
)
WHERE l.organization_id IS NULL AND l.feed_item_id IS NOT NULL;

UPDATE public.logs l
SET organization_id = (
  SELECT f.organization_id
  FROM public.feeds f
  WHERE f.id = l.feed_id
  LIMIT 1
)
WHERE l.organization_id IS NULL AND l.feed_id IS NOT NULL;

UPDATE public.logs l
SET organization_id = (
  SELECT om.organization_id
  FROM public.organization_members om
  WHERE om.user_id = l.user_id
  LIMIT 1
)
WHERE l.organization_id IS NULL AND l.user_id IS NOT NULL;

-- 4. RLS: isolamento nuclear por tenant
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas conflitantes
DROP POLICY IF EXISTS "Isolamento: logs" ON public.logs;
DROP POLICY IF EXISTS "Nuclear_Isolation_logs" ON public.logs;
DROP POLICY IF EXISTS "Logs: Master Control" ON public.logs;
DROP POLICY IF EXISTS "Logs: Member Insert/View" ON public.logs;
DROP POLICY IF EXISTS "Logs: Member Insert" ON public.logs;
DROP POLICY IF EXISTS "logs_tenant_isolation" ON public.logs;

-- Política 1: Master Admin vê e faz tudo
CREATE POLICY "logs_master_admin_all" ON public.logs
  FOR ALL TO authenticated
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

-- Política 2: Usuário vê APENAS os logs da própria organização
CREATE POLICY "logs_tenant_select" ON public.logs
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_my_organization_strict()
    AND organization_id IS NOT NULL
  );

-- Política 3: Usuário só insere logs da própria organização
CREATE POLICY "logs_tenant_insert" ON public.logs
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_my_organization_strict()
    AND organization_id IS NOT NULL
  );

-- Política 4: Usuário NÃO pode UPDATE nem DELETE logs (imutabilidade de auditoria)
-- (Sem política de UPDATE/DELETE para authenticated = ninguém além do master pode alterar)

-- 5. Service Role (Edge Functions) bypassa RLS automaticamente — OK.
--    Mas o trigger garante que organization_id sempre é preenchido.

-- 6. Verificação final
DO $$
DECLARE
  v_policy_count INT;
  v_orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'logs' AND schemaname = 'public';
  
  SELECT COUNT(*) INTO v_orphan_count
  FROM public.logs
  WHERE organization_id IS NULL;
  
  RAISE NOTICE 'Logs RLS configurado: % políticas ativas. Logs sem tenant: %', v_policy_count, v_orphan_count;
END $$;
