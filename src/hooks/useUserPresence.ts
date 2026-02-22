import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to track user presence in the application.
 * Updates 'last_seen_at' in the 'user_profiles' table.
 */
export const useUserPresence = (userId?: string) => {
  useEffect(() => {
    if (!userId) return;

    const updatePresence = async () => {
      try {
        await (supabase as any)
          .from('user_profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', userId);
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    // Update immediately on mount
    updatePresence();

    // Update every 5 minutes while active
    const interval = setInterval(updatePresence, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userId]);
};
