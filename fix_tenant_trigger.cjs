
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://aozbgeguelpphxhptrwy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sql = `
-- CORREÇÃO: Permitir bypass do service_role no isolamento de tenant
-- Isso é necessário para automações, crons e webhooks funcionarem

CREATE OR REPLACE FUNCTION public.trg_enforce_tenant_isolation()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. BYPASS para service_role (automações internas)
  -- Importante: crons e edge functions usam esse papel
  IF (auth.role() = 'service_role') THEN
    RETURN NEW;
  END IF;

  -- 2. Se o usuário for Master Admin, ele pode inserir em qualquer org
  -- (Desde que ele envie o organization_id manualmente)
  IF public.is_master_admin() THEN
    RETURN NEW;
  END IF;

  -- 3. Para usuários comuns, forçamos o isolamento via mapeamento
  NEW.organization_id := public.get_my_organization_strict();
  
  -- Se ainda for nulo, o usuário não tem organização e não pode criar nada
  IF NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não vinculado a nenhuma organização ativa.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

async function fixTrigger() {
    console.log('Updating trg_enforce_tenant_isolation to allow service_role...');
    try {
        const response = await fetch(supabaseUrl + '/functions/v1/run-sql-once', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + supabaseKey
            },
            body: JSON.stringify({ query: sql })
        });
        const result = await response.text();
        console.log('Result:', result);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

fixTrigger();
