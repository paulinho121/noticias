import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Rss,
  Calendar,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Eye,
  LogOut,
  Atom,
  User,
  Shield,
  CreditCard,
  LifeBuoy,
  Crown,
  BarChart3,
  Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';
import { useSubscription } from '@/hooks/useSubscription';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Feeds', href: '/feeds', icon: Rss },
  { name: 'Posts', href: '/review', icon: Eye },
  { name: 'Agendamentos', href: '/schedules', icon: Calendar },
  { name: 'Logs', href: '/logs', icon: FileText },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobile?: boolean;
  className?: string;
}

export function Sidebar({ collapsed, setCollapsed, mobile = false, className }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const { settings } = useWhiteLabel();
  const { subscription } = useSubscription();

  const isMaster = subscription?.is_master_admin;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Até logo!');
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        "bg-sidebar-background transition-all duration-300 flex flex-col h-full",
        mobile ? "w-full" : "fixed left-0 top-0 z-[50] h-screen border-r border-sidebar-border",
        !mobile && (collapsed ? "w-[80px]" : "w-[256px]"),
        className
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 border-b border-sidebar-border shrink-0 transition-all duration-300 bg-sidebar relative overflow-hidden",
        collapsed && !mobile ? "justify-center p-4" : "px-6 py-6"
      )}>
        {/* Subtle glow behind logo */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />

        {(!collapsed || mobile) ? (
          <div className="flex flex-col gap-1.5 animate-in fade-in zoom-in duration-300 relative z-10">
            <img
              src={settings.logo_url || "/logo.png"}
              alt={settings.app_name}
              className="h-10 w-auto object-contain filter drop-shadow-[0_0_15px_rgba(var(--primary),0.3)] dark:invert transition-all duration-300"
            />


          </div>
        ) : (
          <div className="relative animate-in fade-in zoom-in duration-300 z-10">
            <img
              src={settings.favicon_url || "/pwa-icon.png"}
              alt="Icon"
              className="w-10 h-10 object-contain"
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {[
          ...navigation,
          ...(isMaster ? [{ name: 'Founder Console', href: '/master', icon: BarChart3 }] : [])
        ].map((item) => {
          const isActive = location.pathname === item.href;
          const isExpired = subscription?.is_expired && subscription?.plan_type === 'free_trial';
          const isBillingItem = item.href === '/settings?tab=billing';
          const targetHref = isExpired ? '/settings?tab=billing' : item.href;

          return (
            <Link
              key={item.name}
              to={targetHref}
              onClick={(e) => {
                if (isExpired && !isBillingItem) {
                  // Keep the link but ensure it goes to billing
                  // The 'to' prop already handles this, but we can add a toast or similar
                }
              }}
              className={cn(
                "nav-link",
                isActive && "active",
                (collapsed && !mobile) && "justify-center px-0 h-10 w-10 mx-auto",
                isExpired && !isBillingItem && "opacity-80"
              )}
            >
              <div className="relative">
                <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground/80")} />
                {isExpired && !isBillingItem && (
                  <div className="absolute -top-1.5 -right-1.5 bg-background rounded-full p-0.5 shadow-sm border border-border/50">
                    <Lock className="w-2 h-2 text-amber-500" />
                  </div>
                )}
              </div>
              {(!collapsed || mobile) && (
                <div className="flex items-center justify-between flex-1 min-w-0">
                  <span>{item.name}</span>
                  {isExpired && !isBillingItem && <Lock className="w-3 h-3 text-muted-foreground/40 ml-2" />}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Upgrade Card / Plan Info */}
      {(!collapsed || mobile) && (
        <div className="mx-4 mb-4 p-4 rounded-2xl bg-gradient-to-br from-primary/5 via-muted/40 to-accent/5 border border-border/50 shrink-0 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 blur-3xl -translate-y-1/2 translate-x-1/2" />

          {subscription?.plan_type !== 'pro' && subscription?.plan_type !== 'enterprise' ? (
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Crown className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-black text-foreground uppercase tracking-tight">
                    {subscription?.plan_type === 'free_trial' ? 'Teste Gratuito' : 'Upgrade para PRO'}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {subscription?.days_left !== undefined ? `${subscription.days_left} dias restantes` : 'Desbloqueie todo o poder'}
                  </p>
                </div>
              </div>

              {subscription?.plan_type === 'free_trial' && (
                <div className="h-1 w-full bg-primary/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (subscription.days_left / 7) * 100)}%` }}
                    className={cn(
                      "h-full rounded-full bg-amber-500"
                    )}
                  />
                </div>
              )}

              <button
                onClick={() => navigate('/settings?tab=billing')}
                className="w-full py-2 px-3 rounded-lg bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-wider shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95"
              >
                Assinar Agora
              </button>
            </div>
          ) : (
            <div className="relative z-10 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black">Status do Plano</p>
                {subscription?.days_left !== undefined && subscription.days_left <= 7 && (
                  <Badge variant="destructive" className="h-4 px-1.5 text-[8px] font-black animate-pulse">EXPIRANDO</Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    subscription?.status === 'active' ? "bg-success" : "bg-amber-500"
                  )} />
                  <span className="text-xs font-bold text-foreground">
                    {subscription?.plan_type === 'enterprise' ? 'Enterprise' : 'Premium PRO'}
                  </span>
                </div>
                <Zap className="w-3.5 h-3.5 text-primary" />
              </div>

              {/* Countdown Timer */}
              {subscription?.trial_ends_at && (
                <div className="pt-2 space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-muted-foreground uppercase tracking-wider">Tempo Restante</span>
                    <span className={cn(
                      "text-primary",
                      subscription.days_left <= 3 && "text-destructive"
                    )}>
                      {subscription.days_left} dias
                    </span>
                  </div>
                  <div className="h-1 w-full bg-primary/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (subscription.days_left / 30) * 100)}%` }}
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        subscription.days_left <= 7 ? "bg-destructive" : "bg-primary"
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Collapse Button (Desktop Only) */}
      {!mobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-muted-foreground" />
          )}
        </button>
      )}

      {/* User Account Section */}
      <div className={cn(
        "p-4 border-t border-sidebar-border shrink-0",
        (collapsed && !mobile) && "px-3"
      )}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "w-full flex items-center gap-3 p-2 rounded-xl transition-all duration-300 group hover:bg-muted border border-transparent hover:border-border",
              (collapsed && !mobile) && "justify-center"
            )}>
              <div className="relative shrink-0">
                <Avatar className="w-9 h-9 border border-border/50 group-hover:border-primary/50 transition-colors">
                  <AvatarImage src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'Admin'}`} />
                  <AvatarFallback>{(user?.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-sidebar-background" />
              </div>

              {(!collapsed || mobile) && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {user?.user_metadata?.full_name || 'Usuário'}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest font-medium">
                    {user?.email?.split('@')[0] || 'admin'}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-80 bg-popover/95 border-border/50 p-0 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            side={mobile ? "top" : "right"}
            align="end"
            sideOffset={12}
          >
            {/* Header com Gradiente Premium */}
            <div className="relative p-6 text-center space-y-4 overflow-hidden">
              {/* Background Decorative Elements */}
              <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/20 blur-[50px] rounded-full" />
              <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-accent/20 blur-[40px] rounded-full" />

              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="relative group/avatar">
                  <div className="absolute -inset-1.5 bg-gradient-to-tr from-primary via-accent to-primary rounded-full blur opacity-40 group-hover/avatar:opacity-70 transition duration-500" />
                  <Avatar className="w-20 h-20 border-2 border-background shadow-2xl relative">
                    <AvatarImage src={user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email || 'Admin'}`} className="bg-muted" />
                    <AvatarFallback className="bg-primary/10 text-primary font-black text-xl">{(user?.email || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>

                  <Badge className={cn(
                    "absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-2 border-background text-[9px] font-black uppercase tracking-widest shadow-xl px-3 h-5 flex items-center justify-center",
                    subscription?.plan_type === 'pro' ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white" :
                      subscription?.plan_type === 'enterprise' ? "bg-gradient-to-r from-emerald-400 to-cyan-500 text-white" :
                        "bg-muted/80 text-muted-foreground backdrop-blur-sm"
                  )}>
                    {subscription?.plan_type === 'pro' ? 'Premium PRO' :
                      subscription?.plan_type === 'enterprise' ? 'Enterprise' :
                        'Free Trial'}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <h4 className="font-black text-lg text-foreground tracking-tight leading-none pt-2">
                    {user?.user_metadata?.full_name || 'Usuário'}
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-medium opacity-70">
                    {user?.email || 'email@exemplo.com'}
                  </p>

                  {subscription?.organization_id && (
                    <div className="mt-2 p-1.5 px-3 rounded-lg bg-primary/5 border border-primary/10 flex flex-col items-center gap-1 group/org">
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary/60">ID da Organização</span>
                      <code className="text-[9px] font-mono text-primary font-bold group-hover/org:text-primary transition-colors">
                        {subscription.organization_id}
                      </code>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DropdownMenuSeparator className="bg-border/30 m-0" />

            <div className="p-2 space-y-1">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="rounded-[12px] gap-3 p-3 cursor-pointer transition-all duration-200 hover:bg-muted focus:bg-muted group/item"
                  onClick={() => window.location.href = '/settings?tab=profile'}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover/item:scale-110 transition-transform">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">Meu Perfil</span>
                    <span className="text-[10px] text-muted-foreground font-medium">Configurações e biografia</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="rounded-[12px] gap-3 p-3 cursor-pointer transition-all duration-200 hover:bg-muted focus:bg-muted group/item"
                  onClick={() => window.location.href = '/settings?tab=security'}
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover/item:scale-110 transition-transform">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">Segurança</span>
                    <span className="text-[10px] text-muted-foreground font-medium">Privacidade e 2FA</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="rounded-[12px] gap-3 p-3 cursor-pointer transition-all duration-200 hover:bg-muted focus:bg-muted group/item"
                  onClick={() => window.location.href = '/settings?tab=billing'}
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover/item:scale-110 transition-transform">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-foreground">Faturamento</span>
                    <span className="text-[10px] text-muted-foreground font-medium">Gerenciar plano e notas</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="bg-border/30 my-1 mx-2" />

              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="rounded-[12px] gap-3 p-3 cursor-pointer transition-all duration-200 hover:bg-muted focus:bg-muted group/item"
                  onClick={() => window.location.href = '/settings?tab=support'}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover/item:scale-110 transition-transform">
                    <LifeBuoy className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-foreground">Suporte Técnico</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </div>

            <div className="p-2 border-t border-border/30 bg-muted/20">
              <DropdownMenuItem
                onClick={handleLogout}
                className="rounded-[12px] gap-3 p-3 text-destructive cursor-pointer hover:bg-destructive/10 transition-all focus:bg-destructive/10 group/logout"
              >
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center group-hover/logout:scale-110 transition-transform">
                  <LogOut className="w-4 h-4" />
                </div>
                <span className="text-sm font-black uppercase tracking-wider">Encerrar Sessão</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
