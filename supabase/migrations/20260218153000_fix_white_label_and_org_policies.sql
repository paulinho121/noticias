-- ========================================================
-- FIX: PERMISSÕES WHITE LABEL E SUPORTE A ROLE 'OWNER'
-- ========================================================

-- 1. Atualizar função is_master_admin para incluir 'owner' e 'admin'
-- Isso garante que donos de organização possam editar suas próprias marcas.
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND is_master = true
  ) OR EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE user_id = auth.uid() 
    AND role IN ('master', 'owner', 'admin')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Garantir que todas as organizações existentes tenham uma entrada em white_label_settings
-- Sem isso, o comando UPDATE no frontend não encontra nada para alterar.
INSERT INTO public.white_label_settings (organization_id, app_name)
SELECT id, 'LabNews' FROM public.organizations o
WHERE NOT EXISTS (SELECT 1 FROM public.white_label_settings w WHERE w.organization_id = o.id)
ON CONFLICT (organization_id) DO NOTHING;

-- 3. Refinar Políticas da Tabela Organizations
-- Permitir que membros com papel admin/owner atualizem a própria org
DROP POLICY IF EXISTS "Orgs: Master tudo" ON public.organizations;
CREATE POLICY "Orgs: Admin/Master full access" ON public.organizations
FOR ALL USING (
    id = public.get_my_organization_strict() OR public.is_master_admin()
)
WITH CHECK (
    id = public.get_my_organization_strict() OR public.is_master_admin()
);

-- 4. Refinar Políticas da Tabela White Label
-- Garantir acesso total (incluindo INSERT se necessário no upsert)
DROP POLICY IF EXISTS "Nuclear_Isolation_white_label_settings" ON public.white_label_settings;
CREATE POLICY "Nuclear_Isolation_white_label_settings" ON public.white_label_settings
FOR ALL TO authenticated
USING (
    organization_id = public.get_my_organization_strict() OR public.is_master_admin()
)
WITH CHECK (
    organization_id = public.get_my_organization_strict() OR public.is_master_admin()
);
