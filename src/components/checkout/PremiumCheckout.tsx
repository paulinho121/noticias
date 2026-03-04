import { useState, useEffect, useRef } from 'react';
import {
    CheckCircle2,
    Crown,
    Zap,
    Star,
    ShieldCheck,
    ArrowRight,
    TrendingUp,
    Lock,
    Timer,
    Sparkles,
    Loader2,
    QrCode,
    CreditCard,
    Copy,
    Check,
    X,
    RefreshCw,
    AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────
type PaymentMethod = 'card' | 'pix';
type PixStatus = 'idle' | 'generating' | 'waiting' | 'approved' | 'expired' | 'error';

interface PixData {
    paymentId: string;
    qrCode: string;
    qrCodeBase64: string;
    planTitle: string;
    amount: number;
    expiresAt: string;
}

// ── PIX Modal ────────────────────────────────────────────────────────────────
function PixModal({ pixData, onClose, onExpired }: {
    pixData: PixData;
    onClose: () => void;
    onExpired: () => void;
}) {
    const [copied, setCopied] = useState(false);
    const [pixStatus, setPixStatus] = useState<'waiting' | 'approved' | 'expired'>('waiting');
    const [timeLeft, setTimeLeft] = useState(0);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Countdown timer
    useEffect(() => {
        const expiry = new Date(pixData.expiresAt).getTime();
        const update = () => {
            const remaining = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining <= 0) {
                setPixStatus('expired');
                onExpired();
            }
        };
        update();
        timerRef.current = setInterval(update, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [pixData.expiresAt]);

    // Polling for payment status every 5 seconds
    useEffect(() => {
        const poll = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const { data } = await supabase.functions.invoke('check-pix-status', {
                    body: { paymentId: pixData.paymentId },
                    headers: session?.access_token
                        ? { Authorization: `Bearer ${session.access_token}` }
                        : undefined,
                });
                if (data?.status === 'approved') {
                    setPixStatus('approved');
                    if (pollRef.current) clearInterval(pollRef.current);
                    if (timerRef.current) clearInterval(timerRef.current);
                    toast.success('🎉 PIX confirmado! Seu plano PRO está ativo!');
                    setTimeout(() => window.location.reload(), 2500);
                }
            } catch {
                // silently ignore polling errors
            }
        };

        pollRef.current = setInterval(poll, 5000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [pixData.paymentId]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(pixData.qrCode);
            setCopied(true);
            toast.success('Código PIX copiado!');
            setTimeout(() => setCopied(false), 3000);
        } catch {
            toast.error('Erro ao copiar. Selecione o código manualmente.');
        }
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${String(sec).padStart(2, '0')}`;
    };

    const minutesLeft = Math.ceil(timeLeft / 60);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="relative w-full max-w-md bg-[#0f1420] border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/60"
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                    <X className="w-4 h-4 text-white/70" />
                </button>

                {/* Header */}
                <div className="bg-gradient-to-br from-[#00B386]/20 to-[#00D4A3]/10 border-b border-white/5 px-6 pt-6 pb-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-[#00B386]/20 border border-[#00B386]/30 flex items-center justify-center">
                            <QrCode className="w-5 h-5 text-[#00B386]" />
                        </div>
                        <div>
                            <h3 className="font-black text-white text-lg">Pagar com PIX</h3>
                            <p className="text-xs text-white/50">{pixData.planTitle}</p>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-1 mt-3">
                        <span className="text-sm text-white/50 font-bold">R$</span>
                        <span className="text-4xl font-black text-white">
                            {pixData.amount.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-white/40 text-sm ml-1">à vista</span>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {pixStatus === 'approved' ? (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex flex-col items-center gap-4 py-6"
                        >
                            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center">
                                <Check className="w-10 h-10 text-emerald-500" />
                            </div>
                            <div className="text-center">
                                <h4 className="text-xl font-black text-white">Pagamento Confirmado!</h4>
                                <p className="text-sm text-white/50 mt-1">Seu plano PRO está sendo ativado…</p>
                            </div>
                            <div className="flex items-center gap-2 text-emerald-500">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm font-medium">Redirecionando…</span>
                            </div>
                        </motion.div>
                    ) : pixStatus === 'expired' ? (
                        <div className="flex flex-col items-center gap-4 py-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                                <AlertCircle className="w-8 h-8 text-red-400" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white">PIX Expirado</h4>
                                <p className="text-sm text-white/50 mt-1">Este QR Code não é mais válido.</p>
                            </div>
                            <Button onClick={onClose} variant="outline" className="border-white/10 text-white hover:bg-white/10">
                                Gerar novo PIX
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* QR Code */}
                            <div className="flex flex-col items-center gap-3">
                                <div className="relative">
                                    <div className="w-52 h-52 rounded-2xl bg-white p-3 shadow-lg shadow-black/30">
                                        <img
                                            src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                                            alt="QR Code PIX"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    {/* Animated border */}
                                    <div className="absolute inset-0 rounded-2xl border-2 border-[#00B386]/40 animate-pulse pointer-events-none" />
                                </div>

                                {/* Timer */}
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                                    <Timer className="w-3.5 h-3.5 text-amber-400" />
                                    <span className="text-xs font-bold text-amber-400">
                                        Expira em {formatTime(timeLeft)}
                                    </span>
                                </div>
                            </div>

                            {/* Status indicator */}
                            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/5">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Aguardando pagamento</span>
                                </div>
                                <div className="ml-auto flex items-center gap-1 text-white/30">
                                    <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
                                    <span className="text-[10px]">verificando</span>
                                </div>
                            </div>

                            {/* Copy code */}
                            <div className="space-y-2">
                                <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Ou copie o código:</p>
                                <div className="flex gap-2">
                                    <div className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                        <p className="text-xs text-white/50 font-mono truncate">{pixData.qrCode}</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={handleCopy}
                                        className={cn(
                                            "rounded-xl h-auto px-3 transition-all",
                                            copied
                                                ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                                                : "bg-[#00B386]/20 border border-[#00B386]/30 text-[#00B386] hover:bg-[#00B386]/30"
                                        )}
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="space-y-2">
                                {[
                                    'Abra o app do seu banco',
                                    'Escolha "Pagar com PIX" e escaneie o QR Code',
                                    'Confirme e pronto — ativação automática em segundos!',
                                ].map((step, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-[#00B386]/20 border border-[#00B386]/30 flex items-center justify-center shrink-0 mt-px">
                                            <span className="text-[10px] font-black text-[#00B386]">{i + 1}</span>
                                        </div>
                                        <p className="text-xs text-white/40 leading-snug">{step}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function PremiumCheckout() {
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'semi-annual' | 'annual'>('semi-annual');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
    const [isLoading, setIsLoading] = useState(false);
    const [pixData, setPixData] = useState<PixData | null>(null);

    const plans = [
        {
            id: 'monthly',
            name: 'Mensal',
            price: '69,90',
            period: '/mês',
            description: 'Ideal para testar a potência total da IA.',
            features: ['IA de Alta Performance', 'Automação de Feeds', 'Suporte Via Ticket'],
            buttonText: 'ASSINAR MENSAL',
            popular: false,
            savings: null,
        },
        {
            id: 'semi-annual',
            name: 'Semestral',
            price: '46,65',
            period: '/mês',
            totalPrice: '279,90',
            description: 'O equilíbrio perfeito entre preço e escala.',
            features: ['Tudo do mensal', 'Prioridade no Processamento', 'Suporte VIP via WhatsApp', 'Acesso Antecipado a Recursos'],
            buttonText: 'QUERO O SEMESTRAL',
            popular: true,
            savings: 'ECONOMIZE 33%',
        },
        {
            id: 'annual',
            name: 'Anual',
            price: '40,82',
            period: '/mês',
            totalPrice: '489,84',
            description: 'Para quem domina o mercado com automação.',
            features: ['Tudo do semestral', 'Manager de Conta Dedicado', 'Consultoria de SEO IA'],
            buttonText: 'DOMINAR COM ANUAL',
            popular: false,
            savings: 'ECONOMIZE 41%',
        }
    ];

    const getSession = async () => {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
            toast.error('Sessão expirada. Faça login novamente.');
            return null;
        }
        return sessionData.session;
    };

    const handleCardCheckout = async (planId: string) => {
        setIsLoading(true);
        try {
            const session = await getSession();
            if (!session) return;

            const { data, error } = await supabase.functions.invoke('create-checkout-session', {
                body: {
                    planId,
                    successUrl: `${window.location.origin}/settings?tab=billing&status=success`,
                    cancelUrl: `${window.location.origin}/settings?tab=billing`
                }
            });

            if (error) {
                const context = (error as any)?.context;
                if (context && typeof context.json === 'function') {
                    const body = await context.json();
                    throw new Error(body?.error || body?.message || error.message);
                }
                throw error;
            }

            if (data && (data.success === false || data.error)) {
                const detailMsg = data.details ? ` (${data.details})` : '';
                throw new Error(`${data.error}${detailMsg}` || 'Erro desconhecido ao processar pagamento');
            }

            if (data?.url) {
                window.open(data.url, '_blank');
            } else {
                toast.error('Erro ao iniciar pagamento. Resposta inválida do servidor.');
            }
        } catch (error: any) {
            const msg = error?.message || error?.error_description || 'Falha ao comunicar com o Mercado Pago.';
            toast.error(`Erro: ${msg}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePixCheckout = async (planId: string) => {
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data, error } = await supabase.functions.invoke('create-pix-payment', {
                body: { planId },
                headers: { Authorization: `Bearer ${session.access_token}` },
            });

            if (error) throw new Error(error.message);
            if (!data?.success) throw new Error(data?.error || 'Erro ao gerar PIX.');

            setPixData({
                paymentId: data.paymentId,
                qrCode: data.qrCode,
                qrCodeBase64: data.qrCodeBase64,
                planTitle: data.planTitle,
                amount: data.amount,
                expiresAt: data.expiresAt,
            });
        } catch (error: any) {
            toast.error(`Erro ao gerar PIX: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = (planId: string) => {
        if (paymentMethod === 'pix') {
            handlePixCheckout(planId);
        } else {
            handleCardCheckout(planId);
        }
    };

    const getButtonLabel = (plan: typeof plans[0]) => {
        if (isLoading && selectedPlan === plan.id) return paymentMethod === 'pix' ? 'Gerando PIX…' : 'Processando…';
        if (paymentMethod === 'pix') return `PAGAR COM PIX`;
        return plan.buttonText;
    };

    return (
        <>
            <div className="w-full max-w-6xl mx-auto py-12 px-4 space-y-12">
                {/* Header */}
                <div className="text-center space-y-4">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs uppercase tracking-widest"
                    >
                        <Crown className="w-4 h-4 fill-primary" />
                        Upgrade para o Próximo Nível
                    </motion.div>

                    <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
                        Escolha o Plano que vai{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600">
                            Escalar seu Negócio
                        </span>
                    </h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                        Não deixe sua automação parar. Recupere o tempo que você gasta criando conteúdo e deixe a IA trabalhar por você 24h por dia.
                    </p>
                </div>

                {/* Payment Method Selector */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex justify-center"
                >
                    <div className="flex items-center gap-1 p-1 rounded-2xl bg-card border border-border/50 shadow-inner">
                        <button
                            onClick={() => setPaymentMethod('card')}
                            className={cn(
                                "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
                                paymentMethod === 'card'
                                    ? "bg-primary text-white shadow-lg shadow-primary/30 scale-[1.02]"
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                            )}
                        >
                            <CreditCard className="w-4 h-4" />
                            Cartão / Assinatura
                        </button>
                        <button
                            onClick={() => setPaymentMethod('pix')}
                            className={cn(
                                "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
                                paymentMethod === 'pix'
                                    ? "bg-[#00B386] text-white shadow-lg shadow-[#00B386]/30 scale-[1.02]"
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                            )}
                        >
                            <QrCode className="w-4 h-4" />
                            PIX
                            <span className="text-[10px] font-black bg-white/20 px-1.5 py-0.5 rounded-full">
                                À VISTA
                            </span>
                        </button>
                    </div>
                </motion.div>

                {/* PIX info banner */}
                <AnimatePresence>
                    {paymentMethod === 'pix' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: -24 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="flex items-center justify-center gap-3 px-5 py-3 rounded-2xl bg-[#00B386]/10 border border-[#00B386]/20 max-w-lg mx-auto"
                        >
                            <Zap className="w-4 h-4 text-[#00B386] shrink-0" />
                            <p className="text-sm text-[#00B386] font-medium">
                                Pagamento único à vista — ativação automática em segundos após a confirmação do PIX.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Plans */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                    {plans.map((plan, idx) => (
                        <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            onClick={() => setSelectedPlan(plan.id as any)}
                            className={cn(
                                "relative cursor-pointer transition-all duration-500 rounded-[32px] overflow-hidden flex flex-col h-full border-2",
                                selectedPlan === plan.id
                                    ? "bg-[#111827] border-primary shadow-[0_0_40px_rgba(var(--primary),0.15)] scale-[1.02] z-10"
                                    : "bg-card border-border/50 hover:border-primary/30"
                            )}
                        >
                            {plan.popular && (
                                <div
                                    className="absolute top-0 inset-x-0 h-10 bg-gradient-to-r from-primary to-accent flex items-center justify-center"
                                    onClick={() => setSelectedPlan(plan.id as any)}
                                >
                                    <span className="text-white text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Star className="w-3 h-3 fill-white" /> MAIS ESCOLHIDO <Star className="w-3 h-3 fill-white" />
                                    </span>
                                </div>
                            )}

                            <div className={cn("p-8 pt-14 flex-1 space-y-6", !plan.popular && "pt-8")}>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className={cn("text-xl font-bold", selectedPlan === plan.id ? "text-white" : "text-foreground")}>
                                            {plan.name}
                                        </h3>
                                        {plan.savings && (
                                            <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 font-black">
                                                {plan.savings}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex items-baseline gap-1">
                                        <span className="text-sm font-bold text-muted-foreground">R$</span>
                                        <span className={cn("text-5xl font-black tracking-tighter", selectedPlan === plan.id ? "text-white" : "text-foreground")}>
                                            {plan.price}
                                        </span>
                                        <span className="text-muted-foreground font-medium">{plan.period}</span>
                                    </div>
                                    {(plan as any).totalPrice && (
                                        <p className="text-xs text-muted-foreground font-medium">
                                            {paymentMethod === 'pix' ? 'PIX único de' : 'Cobrado'} R$ {(plan as any).totalPrice}
                                        </p>
                                    )}
                                    <p className="text-sm text-muted-foreground leading-relaxed">{plan.description}</p>
                                </div>

                                <div className={cn("h-px w-full", selectedPlan === plan.id ? "bg-white/10" : "bg-border/50")} />

                                <div className="space-y-4">
                                    <p className={cn("text-xs font-bold uppercase tracking-wider", selectedPlan === plan.id ? "text-white/70" : "text-foreground/70")}>
                                        O que está incluído:
                                    </p>
                                    {plan.features.map((feature, fIdx) => (
                                        <div key={fIdx} className="flex items-start gap-3">
                                            <div className={cn("mt-1 w-5 h-5 rounded-full flex items-center justify-center shrink-0", selectedPlan === plan.id ? "bg-primary/20" : "bg-primary/10")}>
                                                <CheckCircle2 className="w-3 h-3 text-primary" />
                                            </div>
                                            <span className={cn("text-sm leading-tight", selectedPlan === plan.id ? "text-white/80" : "text-foreground/80")}>
                                                {feature}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-8 pt-0">
                                <Button
                                    size="lg"
                                    className={cn(
                                        "w-full h-14 font-black transition-all gap-2",
                                        selectedPlan === plan.id
                                            ? paymentMethod === 'pix'
                                                ? "bg-[#00B386] text-white shadow-xl shadow-[#00B386]/30 hover:scale-[1.02] hover:bg-[#00c99a]"
                                                : "bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.02]"
                                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAction(plan.id);
                                    }}
                                    disabled={isLoading}
                                >
                                    {isLoading && selectedPlan === plan.id
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : paymentMethod === 'pix'
                                            ? <QrCode className="w-4 h-4" />
                                            : <ArrowRight className="w-4 h-4" />
                                    }
                                    {getButtonLabel(plan)}
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Trust badges */}
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 pt-6">
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-center">
                            <ShieldCheck className="w-6 h-6 text-emerald-500" />
                        </div>
                        <h4 className="font-bold text-sm text-foreground">Garantia Total</h4>
                        <p className="text-xs text-muted-foreground">7 dias de garantia incondicional.</p>
                    </div>
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-center">
                            <Timer className="w-6 h-6 text-primary" />
                        </div>
                        <h4 className="font-bold text-sm text-foreground">Ativação Imediata</h4>
                        <p className="text-xs text-muted-foreground">Acesso liberado segundos após o pagamento.</p>
                    </div>
                    <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-center">
                            <Lock className="w-6 h-6 text-blue-500" />
                        </div>
                        <h4 className="font-bold text-sm text-foreground">Pagamento Seguro</h4>
                        <p className="text-xs text-muted-foreground">Processamento via Mercado Pago.</p>
                    </div>
                </div>
            </div>

            {/* PIX Modal */}
            <AnimatePresence>
                {pixData && (
                    <PixModal
                        pixData={pixData}
                        onClose={() => setPixData(null)}
                        onExpired={() => { }}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
