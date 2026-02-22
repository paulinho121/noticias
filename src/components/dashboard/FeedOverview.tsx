import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Rss, Clock, MoreVertical, Play, Pause, Plus, Loader2 } from 'lucide-react';
import { feedsApi, schedulesApi, categoriesApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function FeedOverview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: feeds = [] } = useQuery({
    queryKey: ['feeds'],
    queryFn: feedsApi.getAll,
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules'],
    queryFn: schedulesApi.getAll,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  });

  const processFeedMutation = useMutation({
    mutationFn: feedsApi.processFeed,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      queryClient.invalidateQueries({ queryKey: ['feed-items'] });
      if (data.success) {
        toast.success(`Processado! ${data.itemsFetched || 0} itens buscados, ${data.itemsRewritten || 0} reescritos.`);
      } else {
        toast.error('Erro: ' + data.error);
      }
    },
    onError: (error) => {
      toast.error('Erro: ' + (error as Error).message);
    },
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: schedulesApi.toggleActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  const getScheduleByFeedId = (feedId: string) => {
    return schedules.find(s => s.feed_id === feedId);
  };

  const getCategoryById = (categoryId: string | null) => {
    if (!categoryId) return undefined;
    return categories.find(c => c.id === categoryId);
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Feeds Ativos</h3>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/feeds')}>
          <Plus className="w-4 h-4" />
          Novo Feed
        </Button>
      </div>

      {feeds.length === 0 ? (
        <EmptyState
          icon={Rss}
          title="Nenhum feed configurado"
          description="Adicione seu primeiro feed RSS para começar a importar conteúdo automaticamente."
          action={{
            label: "Adicionar Feed",
            onClick: () => navigate('/feeds')
          }}
          className="py-8"
        />
      ) : (
        <div className="space-y-3">
          {feeds.slice(0, 5).map((feed) => {
            const schedule = getScheduleByFeedId(feed.id);
            const category = getCategoryById(feed.category_id);
            const isActive = schedule?.is_active;
            const isProcessing = processFeedMutation.isPending && processFeedMutation.variables === feed.id;

            return (
              <div
                key={feed.id}
                className="feed-row group"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    isActive ? "bg-primary/10" : "bg-muted"
                  )}>
                    {isProcessing ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : (
                      <Rss className={cn(
                        "w-5 h-5",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">{feed.name}</p>
                      {category && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                          {category.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {schedule?.schedule_type === 'interval'
                        ? `A cada ${schedule.interval_minutes} min`
                        : schedule?.schedule_time || 'Não agendado'
                      }
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => schedule && toggleScheduleMutation.mutate(schedule.id)}
                    >
                      {isActive ? (
                        <Pause className="w-4 h-4 text-warning" />
                      ) : (
                        <Play className="w-4 h-4 text-primary" />
                      )}
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate('/feeds')}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/logs')}>
                          Ver Logs
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => processFeedMutation.mutate(feed.id)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'Processando...' : 'Processar Agora'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
