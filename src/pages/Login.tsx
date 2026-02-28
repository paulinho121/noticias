import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sparkles,
    Mail,
    Lock,
    User,
    ArrowRight,
    Loader2,
    ShieldCheck,
    Zap,
    Github
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';

export default function Login() {
    const navigate = useNavigate();
    const { settings } = useWhiteLabel();
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [companyName, setCompanyName] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                toast.success('Bem-vindo de volta!');
                navigate('/');
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            company_name: companyName,
                        },
                    },
                });
                if (error) throw error;
                toast.success('Conta criada com sucesso! Verifique seu e-mail.');
            }
        } catch (error: any) {
            toast.error(error.message || 'Erro na autenticação');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        if (!isLogin && !companyName) {
            toast.error('Por favor, informe o nome da empresa para criar sua conta.');
            return;
        }

        setIsLoading(true);
        try {
            if (!isLogin) {
                localStorage.setItem('pending_registration_company', companyName);
                localStorage.setItem('pending_registration_name', fullName);
            }

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/`,
                },
            });
            if (error) throw error;
        } catch (error: any) {
            toast.error(error.message || 'Erro na autenticação com Google');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background relative overflow-hidden font-inter">
            {/* Professional Background System */}
            <div className="absolute inset-0 z-0 bg-[#f8fafc] dark:bg-background">
                <div
                    className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h1v1H0z' fill='currentColor'/%3E%3C/svg%3E")`
                    }}
                />
                <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-primary/5 blur-[120px] rounded-full animate-pulse-slow" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[70%] h-[70%] bg-accent/5 blur-[120px] rounded-full animate-pulse-slow" />
            </div>

            <div className="w-full max-w-[440px] relative z-10 p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card relative border-border/50 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden bg-white dark:bg-card/40"
                >
                    {/* Dark Header Header - Brand consistency */}
                    <div className="bg-[#000000] pt-12 pb-10 px-10 relative overflow-hidden text-center border-b border-white/5">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />

                        <div className="relative z-10 flex flex-col items-center gap-4">
                            <div className="relative group">
                                <div className="absolute inset-0 bg-primary/20 blur-[30px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                <img
                                    src={settings.logo_url || "/logo.png"}
                                    alt={settings.app_name}
                                    className="h-14 w-auto object-contain filter drop-shadow-[0_0_20px_rgba(var(--primary),0.4)] transition-transform duration-500 group-hover:scale-105"
                                    onError={(e) => {
                                        e.currentTarget.src = "/logo.png";
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Form Body */}
                    <div className="p-10 space-y-8">
                        <form onSubmit={handleAuth} className="space-y-6">
                            {!isLogin && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground ml-1">Nome Completo</Label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <User className="w-4 h-4 text-muted-foreground/40 transition-colors group-focus-within:text-primary" />
                                            </div>
                                            <input
                                                id="name"
                                                placeholder="Nome e Sobrenome"
                                                className="w-full h-13 pl-11 bg-muted/20 dark:bg-white/[0.02] border border-border/60 rounded-2xl ring-offset-background transition-all focus:bg-background dark:focus:bg-white/[0.04] focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none text-foreground text-sm font-medium"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                required={!isLogin}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="company" className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground ml-1">Nome da Empresa</Label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Zap className="w-4 h-4 text-muted-foreground/40 transition-colors group-focus-within:text-primary" />
                                            </div>
                                            <input
                                                id="company"
                                                placeholder="Sua Agência ou Empresa"
                                                className="w-full h-13 pl-11 bg-muted/20 dark:bg-white/[0.02] border border-border/60 rounded-2xl ring-offset-background transition-all focus:bg-background dark:focus:bg-white/[0.04] focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none text-foreground text-sm font-medium"
                                                value={companyName}
                                                onChange={(e) => setCompanyName(e.target.value)}
                                                required={!isLogin}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}


                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground ml-1">E-mail Corporativo</Label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="w-4 h-4 text-muted-foreground/40 transition-colors group-focus-within:text-primary" />
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="seu@parceiro.com"
                                        className="w-full h-13 pl-11 bg-muted/20 dark:bg-white/[0.02] border border-border/60 rounded-2xl ring-offset-background transition-all focus:bg-background dark:focus:bg-white/[0.04] focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none text-foreground text-sm font-medium"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Senha de Acesso</Label>
                                    {isLogin && (
                                        <button type="button" className="text-[10px] font-black text-primary/70 hover:text-primary transition-colors uppercase tracking-wider">
                                            Recuperar
                                        </button>
                                    )}
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="w-4 h-4 text-muted-foreground/40 transition-colors group-focus-within:text-primary" />
                                    </div>
                                    <input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="w-full h-13 pl-11 bg-muted/20 dark:bg-white/[0.02] border border-border/60 rounded-2xl ring-offset-background transition-all focus:bg-background dark:focus:bg-white/[0.04] focus:ring-4 focus:ring-primary/5 focus:border-primary/30 outline-none text-foreground text-sm font-medium"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-13 bg-gradient-to-r from-primary to-primary/90 hover:to-primary text-primary-foreground font-black text-sm transition-all duration-300 group shadow-lg shadow-primary/20 hover:shadow-primary/40 rounded-2xl gap-2 active:scale-[0.98]"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <span>{isLogin ? 'ACESSAR PLATAFORMA' : 'CRIAR MINHA CONTA'}</span>
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border/50"></div>
                            </div>
                            <div className="relative flex justify-center text-[9px] uppercase tracking-[0.2em] font-black">
                                <span className="bg-white dark:bg-[#0c0c0e] px-4 text-muted-foreground/40">Conexão Segura</span>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            onClick={handleGoogleAuth}
                            disabled={isLoading}
                            className="w-full h-13 border-border bg-transparent hover:bg-muted/50 text-foreground transition-all flex items-center justify-center gap-3 rounded-2xl font-bold text-sm"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                    </svg>
                                    <span>{isLogin ? 'Entrar com Google' : 'Cadastrar-se com Google'}</span>
                                </>
                            )}
                        </Button>

                    </div>

                    {/* Footer Nav */}
                    <div className="pb-10 px-10 text-center">
                        <p className="text-xs text-muted-foreground font-medium">
                            {isLogin ? 'Ainda não tem acesso?' : 'Já possui credenciais?'}
                            <button
                                type="button"
                                onClick={() => setIsLogin(!isLogin)}
                                className="ml-2 text-primary font-black hover:underline underline-offset-4 decoration-primary/30"
                            >
                                {isLogin ? 'Solicitar agora' : 'Fazer login'}
                            </button>
                        </p>
                    </div>
                </motion.div>
            </div >
        </div >
    );
}
