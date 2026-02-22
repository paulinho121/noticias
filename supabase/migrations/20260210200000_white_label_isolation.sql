-- ==========================================
-- ESTRUTURA PARA WHITE LABEL E ISOLAMENTO (TENANCY)
-- ==========================================

-- 0. Garantir Colunas de Admin
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='user_profiles' AND COLUMN_NAME='is_master') THEN
    ALTER TABLE public.user_profiles ADD COLUMN is_master BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 1. Funções Auxiliares para RLS (Necessárias para defaults)
CREATE OR REPLACE FUNCTION public.get_my_organization()
RETURNS UUID AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN AS $$
  -- Verifica se o usuário tem o perfil master ou se é master no organization_members
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_master = true
  ) OR EXISTS (
    SELECT 1 FROM public.organization_members WHERE user_id = auth.uid() AND role = 'master'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Tabelas de Organização e Configurações
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#00E5BC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- member, admin, master
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.white_label_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  app_name TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  custom_domain TEXT,
  support_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Garantir Coluna organization_id em tabelas de negócio
DO $$ 
BEGIN
  -- feeds
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='feeds' AND COLUMN_NAME='organization_id') THEN
    ALTER TABLE public.feeds ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
  END IF;
  
  -- schedules
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='schedules' AND COLUMN_NAME='organization_id') THEN
    ALTER TABLE public.schedules ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
  END IF;

  -- feed_items
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='feed_items' AND COLUMN_NAME='organization_id') THEN
    ALTER TABLE public.feed_items ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
  END IF;

  -- logs
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='logs' AND COLUMN_NAME='organization_id') THEN
    ALTER TABLE public.logs ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
  END IF;

  -- categories
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='categories' AND COLUMN_NAME='organization_id') THEN
    ALTER TABLE public.categories ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
  END IF;

  -- platform_settings
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='platform_settings' AND COLUMN_NAME='organization_id') THEN
    ALTER TABLE public.platform_settings ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
  END IF;

  -- admin_notifications
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='admin_notifications' AND COLUMN_NAME='organization_id') THEN
    ALTER TABLE public.admin_notifications ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
  END IF;

  -- Aplicar defaults baseados na sessão (helper)
  ALTER TABLE public.feeds ALTER COLUMN organization_id SET DEFAULT public.get_my_organization();
  ALTER TABLE public.schedules ALTER COLUMN organization_id SET DEFAULT public.get_my_organization();
  ALTER TABLE public.feed_items ALTER COLUMN organization_id SET DEFAULT public.get_my_organization();
  ALTER TABLE public.logs ALTER COLUMN organization_id SET DEFAULT public.get_my_organization();
  ALTER TABLE public.categories ALTER COLUMN organization_id SET DEFAULT public.get_my_organization();
  ALTER TABLE public.platform_settings ALTER COLUMN organization_id SET DEFAULT public.get_my_organization();
  ALTER TABLE public.admin_notifications ALTER COLUMN organization_id SET DEFAULT public.get_my_organization();
END $$;

-- 3. Inserir Organização Padrão e Vínculo para usuários existentes (opcional/segurança)
DO $$
DECLARE
    default_org_id UUID;
BEGIN
    -- Só cria se não houver nenhuma organização
    IF NOT EXISTS (SELECT 1 FROM public.organizations) THEN
        INSERT INTO public.organizations (name, slug) 
        VALUES ('Labnews Pro', 'default') 
        RETURNING id INTO default_org_id;

        INSERT INTO public.white_label_settings (organization_id, app_name)
        VALUES (default_org_id, 'Labnews.pro');

        -- Vincular todos os usuários atuais à organização padrão
        INSERT INTO public.organization_members (organization_id, user_id, role)
        SELECT default_org_id, id, 'master' FROM auth.users
        ON CONFLICT DO NOTHING;

        -- Atribuir organização padrão aos dados órfãos
        UPDATE public.feeds SET organization_id = default_org_id WHERE organization_id IS NULL;
        UPDATE public.schedules SET organization_id = default_org_id WHERE organization_id IS NULL;
        UPDATE public.feed_items SET organization_id = default_org_id WHERE organization_id IS NULL;
        UPDATE public.logs SET organization_id = default_org_id WHERE organization_id IS NULL;
        UPDATE public.categories SET organization_id = default_org_id WHERE organization_id IS NULL;
        UPDATE public.platform_settings SET organization_id = default_org_id WHERE organization_id IS NULL;
        UPDATE public.admin_notifications SET organization_id = default_org_id WHERE organization_id IS NULL;
    END IF;
END $$;

-- 4. Subindo as paredes (RLS Strict)

-- Função para limpar políticas antigas
CREATE OR REPLACE FUNCTION public.clean_policies(t_name text) RETURNS void AS $$
DECLARE
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = t_name AND schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Executar limpeza
SELECT clean_policies('feeds');
SELECT clean_policies('schedules');
SELECT clean_policies('feed_items');
SELECT clean_policies('logs');
SELECT clean_policies('categories');
SELECT clean_policies('platform_settings');
SELECT clean_policies('admin_notifications');
SELECT clean_policies('organizations');
SELECT clean_policies('organization_members');
SELECT clean_policies('white_label_settings');

-- Aplicar Novas Políticas de Isolamento

-- Organizações
CREATE POLICY "Orgs: Ver própria org" ON public.organizations FOR SELECT USING (id = get_my_organization() OR is_master_admin());
CREATE POLICY "Orgs: Master tudo" ON public.organizations FOR ALL USING (is_master_admin());

-- Membros
CREATE POLICY "Members: Ver colegas" ON public.organization_members FOR SELECT USING (organization_id = get_my_organization() OR is_master_admin());
CREATE POLICY "Members: Master tudo" ON public.organization_members FOR ALL USING (is_master_admin());

-- White Label
CREATE POLICY "WL: Ver própria" ON public.white_label_settings FOR SELECT USING (organization_id = get_my_organization() OR is_master_admin());
CREATE POLICY "WL: Editar própria" ON public.white_label_settings FOR UPDATE USING (organization_id = get_my_organization() OR is_master_admin());

-- Tabelas de Negócio (Isolamento por organization_id)
-- Feeds
CREATE POLICY "Isolamento: feeds" ON public.feeds FOR ALL TO authenticated 
USING (organization_id = get_my_organization() OR is_master_admin())
WITH CHECK (organization_id = get_my_organization() OR is_master_admin());

-- Schedules
CREATE POLICY "Isolamento: schedules" ON public.schedules FOR ALL TO authenticated 
USING (organization_id = get_my_organization() OR is_master_admin())
WITH CHECK (organization_id = get_my_organization() OR is_master_admin());

-- Feed Items
CREATE POLICY "Isolamento: feed_items" ON public.feed_items FOR ALL TO authenticated 
USING (organization_id = get_my_organization() OR is_master_admin())
WITH CHECK (organization_id = get_my_organization() OR is_master_admin());

-- Logs
CREATE POLICY "Isolamento: logs" ON public.logs FOR ALL TO authenticated 
USING (organization_id = get_my_organization() OR is_master_admin())
WITH CHECK (organization_id = get_my_organization() OR is_master_admin());

-- Platform Settings
CREATE POLICY "Isolamento: platform_settings" ON public.platform_settings FOR ALL TO authenticated 
USING (organization_id = get_my_organization() OR is_master_admin())
WITH CHECK (organization_id = get_my_organization() OR is_master_admin());

-- Categories (Permitir globais nulas ou da org)
CREATE POLICY "Isolamento: categories" ON public.categories FOR ALL TO authenticated 
USING (organization_id = get_my_organization() OR organization_id IS NULL OR is_master_admin())
WITH CHECK (organization_id = get_my_organization() OR is_master_admin());

-- Notifications
CREATE POLICY "Isolamento: notifications" ON public.admin_notifications FOR SELECT TO authenticated 
USING (organization_id = get_my_organization() OR organization_id IS NULL OR is_master_admin());
