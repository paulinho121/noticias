import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Rss,
  Calendar,
  FileText,
  CheckCircle,
  Loader2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { feedsApi, schedulesApi, logsApi, feedItemsApi } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const navigate = useNavigate();
  const { settings } = useWhiteLabel();
  // Queries
  const { data: feeds = [], isLoading: feedsLoading } = useQuery({
    queryKey: ['feeds'],
    queryFn: feedsApi.getAll,
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: schedulesApi.getAll,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['logs'],
    queryFn: logsApi.getAll,
  });

  const { data: feedItems = [] } = useQuery({
    queryKey: ['feed-items'],
    queryFn: feedItemsApi.getAll,
  });

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Consider success as items actually published or successfully rewritten
    const todayPosts = feedItems.filter(item =>
      item.status === 'published' &&
      item.processed_at &&
      new Date(item.processed_at) >= today
    ).length;

    const totalProcessed = feedItems.filter(item => item.status !== 'pending').length;
    const successCount = feedItems.filter(item => item.status === 'published' || item.status === 'success').length;

    const successRate = totalProcessed > 0
      ? Math.round((successCount / totalProcessed) * 100)
      : 0;

    const activeFeedsCount = feeds.filter(f => f.is_active).length;
    const pausedFeedsCount = feeds.length - activeFeedsCount;

    // Next schedule
    const sortedSchedules = [...schedules]
      .filter(s => s.is_active && s.next_run)
      .sort((a, b) => new Date(a.next_run!).getTime() - new Date(b.next_run!).getTime());

    const nextSchedule = sortedSchedules[0];
    const nextScheduleFeed = nextSchedule ? feeds.find(f => f.id === nextSchedule.feed_id) : null;

    return {
      activeFeeds: activeFeedsCount,
      pausedFeeds: pausedFeedsCount,
      postsToday: todayPosts,
      successRate,
      nextScheduleTime: nextSchedule?.next_run
        ? new Date(nextSchedule.next_run).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : '--:--',
      nextScheduleName: nextScheduleFeed?.name || 'Nenhum agendado',
    };
  }, [feeds, schedules, logs, feedItems]);

  if (feedsLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header
        title={settings.hero_title || "Painel de Controle"}
        subtitle={settings.hero_subtitle || "Gerenciamento centralizado de automação e inteligência de conteúdo."}
        showAddButton
        addButtonText="Novo Projeto"
        onAddClick={() => navigate('/feeds')}
      />

      <div className="p-3 md:p-8 space-y-4 md:space-y-8 animate-in fade-in duration-500">

        {/* Stats Grid */}
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          <div className="stat-card">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Feeds Ativos</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stats.activeFeeds}</span>
              <span className="text-xs text-muted-foreground">/ {feeds.length} total</span>
            </div>
            <Rss className="absolute top-6 right-6 w-5 h-5 text-muted-foreground/20" />
          </div>

          <div className="stat-card">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Posts Hoje</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stats.postsToday}</span>
              <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/20 bg-primary/5 tracking-widest shrink-0">Auto-pilot</Badge>
            </div>
            <FileText className="absolute top-6 right-6 w-5 h-5 text-muted-foreground/20" />
          </div>

          <div className="stat-card">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Taxa de Sucesso</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stats.successRate}%</span>
              <span className="text-xs text-muted-foreground">Global</span>
            </div>
            <CheckCircle className="absolute top-6 right-6 w-5 h-5 text-muted-foreground/20" />
          </div>

          <div className="stat-card">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">Próxima Execução</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{stats.nextScheduleTime}</span>
              <span className="text-xs text-muted-foreground truncate max-w-[100px]">{stats.nextScheduleName}</span>
            </div>
            <Clock className="absolute top-6 right-6 w-5 h-5 text-muted-foreground/20" />
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white dark:bg-card shadow-sm border border-border/50 rounded-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-foreground">Atividade Recente</h3>
              <a href="/logs" className="px-3 py-1 rounded-full bg-primary/10 text-xs font-bold text-primary hover:bg-primary/20 transition-all">Ver todos</a>
            </div>

            <div className="space-y-6">
              {logs.slice(0, 3).map((log) => (
                <div key={log.id} className="flex items-center gap-4 group cursor-pointer hover:bg-muted/30 p-2 -m-2 rounded-xl transition-colors">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                    log.status === 'success' ? "bg-primary/10" : "bg-orange-50 dark:bg-orange-500/10"
                  )}>
                    {log.status === 'success' ? (
                      <CheckCircle className="w-6 h-6 text-primary" />
                    ) : (
                      <Clock className="w-6 h-6 text-orange-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {log.source_title || log.message}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {feeds.find(f => f.id === log.feed_id)?.name} • {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                  <ExternalLink className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Schedules */}
          <div className="bg-white dark:bg-card shadow-sm border border-border/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-foreground">Próximos Agendamentos</h3>
              <a href="/schedules" className="px-3 py-1 rounded-full bg-primary/10 text-xs font-bold text-primary hover:bg-primary/20 transition-all">Ver todos</a>
            </div>

            <div className="space-y-4">
              {schedules
                .filter(s => s.is_active)
                .slice(0, 3)
                .map((schedule) => {
                  const feed = feeds.find(f => f.id === schedule.feed_id);
                  return (
                    <div key={schedule.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-muted/20 border border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-card flex items-center justify-center shadow-sm border border-border/50">
                          <Rss className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground text-sm">{feed?.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {schedule.schedule_type === 'fixed' ? (
                              <>
                                <Calendar className="w-3 h-3 text-muted-foreground" />
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Fixo</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Intervalo</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground text-sm">
                          {schedule.next_run ? new Date(schedule.next_run).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '10 min'}
                        </p>
                      </div>
                    </div>
                  );
                })}

              {schedules.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Nenhum agendamento ativo</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
