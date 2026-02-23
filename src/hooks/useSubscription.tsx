import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, isAfter } from 'date-fns';

interface SubscriptionData {
    plan_type: 'free_trial' | 'pro' | 'enterprise';
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired';
    trial_ends_at: string | null;
    days_left: number;
    is_expired: boolean;
    organization_id: string | null;
    is_master_admin: boolean;
}

interface SubscriptionContextType {
    subscription: SubscriptionData | null;
    loading: boolean;
    refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchSubscription = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                setSubscription(null);
                return;
            }

            // 1. Pegar a organização do usuário
            const { data: memberData } = await (supabase as any)
                .from('organization_members')
                .select('organization_id')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (memberData) {
                // 2. Buscar dados de faturamento da organização
                const { data: orgData, error } = await (supabase as any)
                    .from('organizations')
                    .select('subscription_plan, trial_ends_at')
                    .eq('id', memberData.organization_id)
                    .single();

                if (orgData) {
                    const trialEnds = orgData.trial_ends_at ? new Date(orgData.trial_ends_at) : null;
                    const now = new Date();
                    const isExpired = orgData.subscription_plan === 'free_trial' && trialEnds ? isAfter(now, trialEnds) : false;
                    const daysLeft = trialEnds ? Math.max(0, differenceInDays(trialEnds, now)) : 0;

                    setSubscription({
                        plan_type: orgData.subscription_plan as any || 'free_trial',
                        status: isExpired ? 'expired' : (orgData.subscription_plan === 'pro' ? 'active' : 'trialing'),
                        trial_ends_at: orgData.trial_ends_at,
                        days_left: daysLeft,
                        is_expired: isExpired,
                        organization_id: memberData.organization_id,
                        is_master_admin: false // Default will be updated below
                    });

                    // 3. Verificar se é Master Admin
                    const { data: isMaster } = await (supabase as any).rpc('is_master_admin');
                    if (isMaster) {
                        setSubscription(prev => prev ? { ...prev, is_master_admin: true } : null);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching subscription:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscription();
    }, []);

    return (
        <SubscriptionContext.Provider value={{ subscription, loading, refreshSubscription: fetchSubscription }}>
            {children}
        </SubscriptionContext.Provider>
    );
}

export function useSubscription() {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
}
