import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para avisar quando a sessão expira
 * Deve ser usado no App root
 * 
 * @example
 * export function AppContent() {
 *   useSessionWarning();
 *   // ... resto do componente
 * }
 */
export function useSessionWarning() {
  const navigate = useNavigate();

  useEffect(() => {
    // Monitorar mudanças de estado de autenticação
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        toast.error('Sua sessão expirou. Faça login novamente.');
        navigate('/login');
      }
    });

    return () => data?.subscription?.unsubscribe();
  }, [navigate]);
}
