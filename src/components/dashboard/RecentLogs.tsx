import { useQuery } from '@tanstack/react-query';
import { ExternalLink, CheckCircle2, XCircle, Loader2, Clock, FileText } from 'lucide-react';
import { logsApi, feedsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EmptyState } from '@/components/ui/empty-state';

const statusConfig = {
  success: {
    icon: CheckCircle2,
    class: 'bg-success/20 text-success',
    label: 'Sucesso'
  },
  error: {
    icon: XCircle,
    class: 'bg-destructive/20 text-destructive',
    label: 'Erro'
  },
  processing: {
    icon: Loader2,
    class: 'bg-primary/20 text-primary',
    label: 'Processando'
  },
  pending: {
    icon: Clock,
    class: 'bg-warning/20 text-warning',
    label: 'Pendente'
  }
};

export function RecentLogs() {
  const { data: logs = [] } = useQuery({
    queryKey: ['logs'],
    queryFn: logsApi.getAll,
    refetchInterval: 5000,
  });

  const { data: feeds = [] } = useQuery({
    queryKey: ['feeds'],
    queryFn: feedsApi.getAll,
  });
  
  const recentLogs = logs.slice(0, 5);

  const getFeedName = (feedId: string | null): string => {
    if (!feedId) return 'Sistema';
    const feed = feeds.find(f => f.id === feedId);
    return feed?.name || 'Feed';
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Atividade Recente</h3>
        {logs.length > 0 && (
          <a href="/logs" className="text-sm text-primary hover:text-primary/80 transition-colors">
            Ver todos
          </a>
        )}
      </div>

      {recentLogs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhuma atividade ainda"
          description="Quando seus feeds começarem a processar conteúdo, você verá a atividade aqui."
          className="py-8"
        />
      ) : (
        <div className="space-y-4">
          {recentLogs.map((log) => {
            const status = statusConfig[log.status];
            const StatusIcon = status.icon;

            return (
              <div 
                key={log.id}
                className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className={cn("mt-0.5 p-1.5 rounded-full", status.class)}>
                  <StatusIcon className={cn(
                    "w-4 h-4",
                    log.status === 'processing' && "animate-spin"
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-primary">{getFeedName(log.feed_id)}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">
                    {log.source_title || log.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{log.message}</p>
                </div>

                {log.source_url && (
                  <a 
                    href={log.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
