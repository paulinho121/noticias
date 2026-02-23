import { useSubscription } from "@/hooks/useSubscription";
import { ShieldAlert, LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { PremiumCheckout } from "../checkout/PremiumCheckout";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function TrialGuard({ children }: { children: React.ReactNode }) {
    const { subscription, loading } = useSubscription();
    const navigate = useNavigate();
    const location = window.location.href;
    const isBillingTab = location.includes('tab=billing');

    if (loading) return null;

    const handleLogout = async () => {
        await supabase.auth.signOut();
        toast.success('Sessão encerrada com sucesso');
        navigate('/login');
    };

    // Se o trial expirou, o plano não é PRO nem ENTERPRISE, e NÃO é Master Admin nem está na aba de faturamento
    if (subscription?.is_expired && subscription.plan_type === 'free_trial' && !subscription.is_master_admin && !isBillingTab) {
        return (
            <div className="relative min-h-[calc(100vh-200px)] flex items-center justify-center p-4 overflow-y-auto w-full">
                {/* Animated Background Elements */}
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/20 blur-[120px] rounded-full animate-pulse-slow" />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="w-full max-w-6xl relative my-auto py-12"
                >
                    <div className="glass-card overflow-hidden border-primary/20 shadow-2xl relative bg-[#030712]/80">
                        {/* Top Badge */}
                        <div className="bg-primary/10 border-b border-primary/10 py-3 px-6 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-primary animate-pulse" />
                                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">Atenção: Seu período de teste expirou</span>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-primary transition-colors"
                            >
                                <LogOut className="w-3 h-3" />
                                Sair da Conta
                            </button>
                        </div>

                        <div className="p-2 md:p-6">
                            <PremiumCheckout />
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return <>{children}</>;
}
