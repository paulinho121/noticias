import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  RefreshCw,
  Trash2,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { logsApi, feedsApi, LogEntry, Feed } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const statusConfig = {
  success: { label: 'Sucesso', icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
  error: { label: 'Erro', icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  processing: { label: 'Processando', icon: Clock, color: 'text-warning', bg: 'bg-warning/10' },
  pending: { label: 'Pendente', icon: Clock, color: 'text-muted-foreground', bg: 'bg-muted' },
};

export default function Logs() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [feedFilter, setFeedFilter] = useState<string>('all');
  const [stepFilter, setStepFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Queries
  const { data: logs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['logs'],
    queryFn: logsApi.getAll,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const { data: feeds = [] } = useQuery({
    queryKey: ['feeds'],
    queryFn: feedsApi.getAll,
  });

  // Mutations
  const clearLogsMutation = useMutation({
    mutationFn: logsApi.clear,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      toast.success('Logs limpos com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao limpar logs: ' + (error as Error).message);
    },
  });

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (statusFilter !== 'all' && log.status !== statusFilter) return false;
    if (feedFilter !== 'all' && log.feed_id !== feedFilter) return false;
    if (stepFilter !== 'all') {
      if (stepFilter === 'image_generation' && !log.step.includes('image')) return false;
      if (stepFilter === 'rewrite' && !log.step.includes('rewrit') && !log.step.includes('process')) return false;
      if (stepFilter === 'publish' && !log.step.includes('publish')) return false;
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        log.message.toLowerCase().includes(search) ||
        (log.source_title?.toLowerCase().includes(search) || false) ||
        (log.step.toLowerCase().includes(search));
      if (!matchesSearch) return false;
    }

    return true;
  });

  const getFeedName = (feedId: string | null): string => {
    if (!feedId) return 'Sistema';
    const feed = feeds.find(f => f.id === feedId);
    return feed?.name || 'Feed Desconhecido';
  };

  if (logsLoading) {
    return (
      <MainLayout>
        <Header title="Logs" subtitle="Acompanhe o processamento em tempo real" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header
        title="Logs"
        subtitle="Acompanhe o processamento em tempo real"
        onSearchChange={setSearchTerm}
      />

      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        {/* Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 md:gap-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32 md:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                  <SelectItem value="processing">Processando</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select value={stepFilter} onValueChange={setStepFilter}>
              <SelectTrigger className="w-full sm:w-40 md:w-48">
                <SelectValue placeholder="Tipo de Operação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Operações</SelectItem>
                <SelectItem value="rewrite">Processamento de Texto</SelectItem>
                <SelectItem value="image_generation">Geração de Imagem</SelectItem>
                <SelectItem value="publish">Publicação</SelectItem>
              </SelectContent>
            </Select>

            <Select value={feedFilter} onValueChange={setFeedFilter}>
              <SelectTrigger className="w-full sm:w-40 md:w-48">
                <SelectValue placeholder="Feed" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Feeds</SelectItem>
                {feeds.map(feed => (
                  <SelectItem key={feed.id} value={feed.id}>{feed.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => refetchLogs()} className="h-9">
              <RefreshCw className="w-4 h-4 mr-2" />
              <span>Atualizar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearLogsMutation.mutate()}
              disabled={logs.length === 0 || clearLogsMutation.isPending}
              className="h-9"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              <span>Limpar</span>
            </Button>
          </div>
        </div>

        {/* Logs List */}
        {filteredLogs.length === 0 ? (
          <div className="glass-card">
            <EmptyState
              icon={FileText}
              title="Nenhum log encontrado"
              description={logs.length === 0
                ? "Os logs aparecerão aqui quando você processar feeds RSS."
                : "Nenhum log corresponde aos filtros selecionados."
              }
            />
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="divide-y divide-border/50">
              {filteredLogs.map((log) => {
                const config = statusConfig[log.status];
                const StatusIcon = config.icon;

                return (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        config.bg
                      )}>
                        <StatusIcon className={cn("w-5 h-5", config.color)} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {log.step}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {getFeedName(log.feed_id)}
                          </span>
                        </div>

                        <p className="font-medium text-foreground">
                          {log.message}
                        </p>

                        {log.source_title && (
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {log.source_title}
                          </p>
                        )}

                        {log.error_details && (
                          <p className="text-sm text-destructive mt-2 p-2 bg-destructive/10 rounded">
                            {log.error_details}
                          </p>
                        )}

                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(log.created_at), "dd MMM yyyy 'às' HH:mm:ss", { locale: ptBR })}
                        </p>
                      </div>

                      {log.source_url && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={log.source_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
