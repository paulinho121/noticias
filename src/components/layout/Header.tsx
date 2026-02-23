import React, { useState } from 'react';
import { Bell, Search, Plus, Send, Sun, Moon, Zap, Rocket, Crown, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminNotificationModal } from '../notifications/AdminNotificationModal';

import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showAddButton?: boolean;
  onAddClick?: () => void;
  addButtonText?: string;
  onSearchChange?: (term: string) => void;
  searchValue?: string;
}

export function Header({
  title,
  subtitle,
  showAddButton = false,
  onAddClick,
  addButtonText = "Adicionar",
  onSearchChange,
  searchValue: initialSearchValue = ""
}: HeaderProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { subscription } = useSubscription();
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialSearchValue);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 md:px-8 py-3 md:py-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-2xl font-bold text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5 truncate hidden sm:block">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-4 ml-auto md:ml-0">
          {/* Search - Hidden on very small screens, shown as icon or compact */}
          {onSearchChange && (
            <>
              {/* Mobile Search Toggle */}
              <button
                className="p-2 rounded-lg hover:bg-muted transition-colors sm:hidden"
                onClick={() => {
                  const searchInput = document.getElementById('mobile-search');
                  searchInput?.classList.toggle('hidden');
                  searchInput?.focus();
                }}
                title="Buscar"
              >
                <Search className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="relative group hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-40 lg:w-64 pl-10 bg-muted/50 border-border/50 focus:border-primary/50 transition-all focus:w-48 lg:focus:w-80 h-9"
                />
              </div>

              {/* Mobile Search Input Overlay/Dropdown */}
              <div id="mobile-search" className="absolute top-full left-0 right-0 p-4 bg-background/95 backdrop-blur-xl border-b border-border hidden sm:hidden z-50 animate-in slide-in-from-top-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="w-full pl-10 bg-muted/50 border-border/50 h-10"
                    onKeyDown={(e) => e.key === 'Escape' && document.getElementById('mobile-search')?.classList.add('hidden')}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex items-center gap-1 md:gap-2">
            {/* Admin Message Button */}
            <button
              onClick={() => setIsNotificationModalOpen(true)}
              className="group relative p-2 rounded-lg hover:bg-muted transition-all duration-200 border border-transparent hover:border-primary/20"
              title="Assistência Técnica Global"
            >
              <Wrench className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            </button>



            {/* Notifications */}
            <button
              className="p-2 rounded-lg hover:bg-muted transition-colors hidden xs:flex"
              title="Notificações"
            >
              <Bell className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
            </button>

            {/* Theme Toggle - Simpler on mobile */}
            <div className="flex bg-muted/40 p-1.5 rounded-xl border border-border/40 shadow-inner">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-1.5 rounded-lg transition-all duration-300 hover:bg-background hover:shadow-sm text-primary group"
                title="Alternar Tema"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 md:w-[1.2rem] md:h-[1.2rem] transition-transform group-hover:rotate-45" />
                ) : (
                  <Moon className="w-4 h-4 md:w-[1.2rem] md:h-[1.2rem] transition-transform group-hover:-rotate-12" />
                )}
              </button>
            </div>
          </div>

          {/* Subscription Counter / Go PRO */}
          {subscription?.plan_type !== 'pro' && subscription?.plan_type !== 'enterprise' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/settings?tab=billing')}
              className="flex items-center gap-2 border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 hover:text-amber-600 transition-all font-bold h-9 group relative overflow-hidden active:scale-95 shrink-0"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Crown className="w-3.5 h-3.5 fill-amber-500 group-hover:scale-110 transition-transform animate-pulse" />
              <span className="hidden xs:inline sm:hidden md:inline lg:hidden xl:inline">
                {subscription?.days_left ? `${subscription.days_left}d` : 'Upgrade'}
              </span>
              <span className="hidden sm:inline md:hidden lg:inline xl:hidden">
                {subscription?.days_left ? `${subscription.days_left} dias` : 'Upgrade'}
              </span>
              <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded ml-1 uppercase font-black tracking-tighter">PRO</span>
            </Button>
          )}

          {/* Add Button */}
          {showAddButton && (
            <Button
              onClick={onAddClick}
              size="sm"
              className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow h-9"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">{addButtonText}</span>
            </Button>
          )}
        </div>
      </div>

      <AdminNotificationModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />
    </header>
  );
}
