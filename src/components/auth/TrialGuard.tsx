import { useSubscription } from "@/hooks/useSubscription";
import { ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";
import { PremiumCheckout } from "../checkout/PremiumCheckout";

export function TrialGuard({ children }: { children: React.ReactNode }) {
    const { subscription, loading } = useSubscription();

    if (loading) return null;

    // Se o trial expirou e o plano não é PRO nem ENTERPRISE
    if (subscription?.is_expired && subscription.plan_type === 'free_trial') {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md p-4 overflow-y-auto">
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
                        <div className="bg-primary/10 border-b border-primary/10 py-3 px-6 flex items-center justify-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-primary animate-pulse" />
                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary text-center">Atenção: Seu período de teste de 7 dias expirou</span>
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
