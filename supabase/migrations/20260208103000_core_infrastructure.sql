-- ========================================================
-- ESTRUTURA BASE DE INFRAESTRUTURA (ORGANIZAÇÕES E CONFIGURAÇÕES)
-- Criado para resolver dependências de migrações posteriores
-- ========================================================

-- 1. Criar Tabela de Organizações (Empresas/Instâncias)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#00E5BC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Vincular usuários a Organizações
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- member, admin, master
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- 3. Configurações de Branding por Organização (White Label)
CREATE TABLE IF NOT EXISTS public.white_label_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  app_name TEXT DEFAULT 'ContentAI',
  hero_title TEXT,
  hero_subtitle TEXT,
  support_email TEXT,
  custom_domain TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Criar Tabela de Configurações de Plataformas (WordPress, etc)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_id TEXT NOT NULL,
  credentials JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_connected BOOLEAN DEFAULT false,
  is_auto_publish BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, platform_id)
);

-- Habilitar RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_label_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Permissões Iniciais
GRANT ALL ON public.organizations TO authenticated, service_role, anon;
GRANT ALL ON public.organization_members TO authenticated, service_role, anon;
GRANT ALL ON public.white_label_settings TO authenticated, service_role, anon;
GRANT ALL ON public.platform_settings TO authenticated, service_role, anon;
