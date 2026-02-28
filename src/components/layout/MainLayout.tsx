import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';
import { useIPGuard } from '@/hooks/useIPGuard';
import { TrialGuard } from '../auth/TrialGuard';
import { useSubscription } from '@/hooks/useSubscription';
import { useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { settings } = useWhiteLabel();
  const { subscription } = useSubscription();
  const location = useLocation();

  const isExpired = subscription?.is_expired && subscription?.plan_type === 'free_trial' && !subscription?.is_master_admin;
  const isBillingTab = location.search.includes('tab=billing');
  const isSettingsPage = location.pathname === '/settings';

  // Proteção de Propriedade Intelectual (Dashboard)
  useIPGuard(true);

  return (
    <div className="min-h-screen bg-background relative selection:bg-primary/10">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-background/80 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2 h-10 w-10">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 border-none w-[280px]">
              <Sidebar collapsed={false} setCollapsed={() => { }} mobile={true} />
            </SheetContent>
          </Sheet>
          <span className="font-bold text-base tracking-tight text-foreground">
            {settings.app_name}
          </span>
        </div>
        <img src={settings.favicon_url || "/pwa-icon.png"} alt="Logo" className="w-8 h-8 object-contain" />
      </div>

      {/* Desktop Sidebar */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} className="hidden md:flex" />

      <main
        className={cn(
          "flex-1 min-h-screen transition-all duration-300 ease-in-out relative flex flex-col",
          collapsed ? "md:ml-[80px]" : "md:ml-[256px]"
        )}
      >
        <div className="flex-1 w-full max-w-[1600px] mx-auto overflow-x-hidden">
          {isExpired && !isBillingTab ? (
            <TrialGuard>
              {children}
            </TrialGuard>
          ) : (
            children
          )}
        </div>

        {/* Custom Footer */}
        <footer className="w-full py-6 px-4 sm:px-8 border-t border-border/30 bg-background/50 backdrop-blur-sm mt-auto">
          <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
                <img src={settings.favicon_url || "/pwa-icon.png"} alt="Icon" className="w-4 h-4 object-contain" />
              </div>
              <span className="text-sm font-bold tracking-tight text-foreground/80">
                {settings.app_name}
              </span>
            </div>

            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest text-center">
              © {new Date().getFullYear()} LabNews • Todos os direitos reservados
            </p>

            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-tighter text-muted-foreground/50">
              <span>Security Hardened</span>
              <span className="w-1 h-1 rounded-full bg-primary/30" />
              <span>Versão de Fábrica 2.5.0</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
