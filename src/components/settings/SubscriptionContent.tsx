import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ShieldCheck,
    Zap,
    Clock,
    CheckCircle2,
    ArrowRight,
    Sparkles,
    Lock,
    Star
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { PremiumCheckout } from "../checkout/PremiumCheckout";

export function SubscriptionContent() {
    const { subscription, loading } = useSubscription();

    if (loading) return null;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Current Plan Header */}
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-8">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Zap className="w-32 h-32 text-primary" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 uppercase tracking-widest text-[10px] py-1 px-3">
                                Status da Conta
                            </Badge>
                            {subscription?.plan_type === 'pro' && (
                                <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 uppercase tracking-widest text-[10px] py-1 px-3">
                                    <Star className="w-3 h-3 mr-1 fill-amber-500" /> PRO
                                </Badge>
                            )}
                        </div>
                        <h2 className="text-3xl font-extrabold text-foreground">
                            {subscription?.plan_type === 'pro' ? 'Plano Profissional Ativo' : 'Período de Teste Grátis'}
                        </h2>
                        <p className="text-muted-foreground text-sm max-w-md">
                            {subscription?.plan_type === 'pro'
                                ? 'Você tem acesso total a todas as ferramentas de automação e inteligência.'
                                : 'Você está aproveitando o poder da nossa IA gratuitamente por 7 dias.'}
                        </p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 min-w-[240px]">
                        {subscription?.plan_type === 'free_trial' ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Expira em</span>
                                    <span className="text-2xl font-black text-primary">{subscription.days_left} dias</span>
                                </div>
                                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(subscription.days_left / 7) * 100}%` }}
                                        className="bg-primary h-full"
                                    />
                                </div>
                                <p className="text-[10px] text-center text-muted-foreground">O acesso será bloqueado após este período.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 text-center">
                                <ShieldCheck className="w-8 h-8 text-primary mx-auto mb-2" />
                                <p className="text-sm font-bold text-foreground">Assinatura Ativa</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Pricing Section */}
            <PremiumCheckout />
        </div>
    );
}
