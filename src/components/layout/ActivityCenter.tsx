import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Activity,
    Loader2,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    Image as ImageIcon,
    Sparkles,
    Layout,
    Clock,
    X,
    Trash2
} from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { logsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export function ActivityCenter() {
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);

    const { data: logs = [], isLoading } = useQuery({
        queryKey: ['active-logs'],
        queryFn: logsApi.getAll,
        refetchInterval: 3000,
    });

    const cancelMutation = useMutation({
        mutationFn: ({ logId, itemId }: { logId: string, itemId?: string }) =>
            logsApi.cancelProcessing(logId, itemId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active-logs'] });
            toast.success('Tarefa removida com sucesso');
        },
        onError: () => toast.error('Erro ao remover tarefa')
    });

    const deleteMutation = useMutation({
        mutationFn: (logId: string) => logsApi.deleteLog(logId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active-logs'] });
        }
    });

    const clearAllMutation = useMutation({
        mutationFn: () => logsApi.clearAllProcessing(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['active-logs'] });
            toast.success('Todos os processos foram interrompidos');
        },
        onError: () => toast.error('Erro ao limpar processos')
    });

    const activeTasks = logs.filter(log => log.status === 'processing');
    const recentCompleted = logs.filter(log => log.status !== 'processing').slice(0, 5);

    const getTaskProgress = (step: string) => {
        switch (step) {
            case 'text_init': return 10;
            case 'text_ai_processing': return 35;
            case 'text_complete': return 60;
            case 'image_gen_processing': return 85;
            case 'image_ready': return 100;
            case 'complete': return 100;
            default: return 15;
        }
    };

    const isStuck = (createdAt: string) => {
        const diff = Date.now() - new Date(createdAt).getTime();
        return diff > 60000; // More than 1 minute without update
    };

    const getStepIcon = (step: string) => {
        if (step.includes('image')) return <ImageIcon className="w-3.5 h-3.5" />;
        if (step.includes('rewrite')) return <Sparkles className="w-3.5 h-3.5" />;
        if (step.includes('publish')) return <Layout className="w-3.5 h-3.5" />;
        return <Activity className="w-3.5 h-3.5" />;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'processing': return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
            case 'success': return <CheckCircle2 className="w-4 h-4 text-primary" />;
            case 'error': return <AlertCircle className="w-4 h-4 text-destructive" />;
            default: return <Clock className="w-4 h-4 text-muted-foreground" />;
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <div className="relative group">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "relative h-9 w-9 rounded-xl border border-transparent transition-all duration-300",
                            activeTasks.length > 0 ? "bg-primary/10 text-primary border-primary/20 animate-pulse" : "hover:bg-muted"
                        )}
                    >
                        <Activity className={cn("h-[1.1rem] w-[1.1rem]", activeTasks.length > 0 && "animate-spin-slow")} />

                        {activeTasks.length > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-primary text-[9px] font-black text-white items-center justify-center">
                                    {activeTasks.length}
                                </span>
                            </span>
                        )}
                    </Button>

                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-900 border border-white/10 rounded text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                        Atividades em Segundo Plano
                    </div>
                </div>
            </PopoverTrigger>

            <PopoverContent className="w-80 p-0 mr-4 mt-2 overflow-hidden border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl" align="end">
                <div className="p-4 border-b border-border/40 bg-muted/20">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                            <Activity className="w-4 h-4 text-primary" />
                            Painel de Atividades
                        </h3>
                        {activeTasks.length > 0 && (
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] animate-pulse">
                                {activeTasks.length} ATIVOS
                            </Badge>
                        )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Acompanhe reescritas e gerações de imagem</p>
                </div>

                <ScrollArea className="max-h-[400px]">
                    <div className="p-1">
                        {activeTasks.length > 0 && (
                            <div className="p-2 space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <p className="text-[10px] font-black uppercase text-primary/80 tracking-widest">Processando agora</p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => clearAllMutation.mutate()}
                                        className="h-6 px-2 text-[9px] font-bold text-destructive hover:bg-destructive/10 hover:text-destructive uppercase tracking-tighter"
                                        disabled={clearAllMutation.isPending}
                                    >
                                        <Trash2 className="w-3 h-3 mr-1" />
                                        Limpar Tudo
                                    </Button>
                                </div>
                                {activeTasks.map((task) => (
                                    <div key={task.id} className={cn(
                                        "group/task p-3 bg-primary/[0.03] border border-primary/10 rounded-lg space-y-2 relative overflow-hidden transition-colors",
                                        isStuck(task.created_at) && "border-amber-500/30 bg-amber-500/[0.02]"
                                    )}>
                                        <button
                                            onClick={() => cancelMutation.mutate({ logId: task.id, itemId: task.feed_item_id })}
                                            className="absolute top-1 right-1 p-1 bg-background border border-border rounded-md opacity-40 group-hover/task:opacity-100 transition-opacity hover:text-destructive z-10 shadow-sm"
                                            title="Cancelar tarefa"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                        <div className="flex items-start gap-3">
                                            <div className={cn(
                                                "p-2 bg-primary/10 rounded-lg shrink-0",
                                                isStuck(task.created_at) && "bg-amber-500/10 text-amber-600"
                                            )}>
                                                {getStepIcon(task.step)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs font-bold truncate leading-tight">{task.message}</p>
                                                    {isStuck(task.created_at) && (
                                                        <Badge variant="outline" className="h-4 px-1 text-[8px] border-amber-500/50 text-amber-600 animate-pulse bg-white dark:bg-zinc-950">
                                                            LENTO
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground truncate">{task.source_title || 'Sem título'}</p>
                                            </div>
                                            <Loader2 className={cn(
                                                "w-3.5 h-3.5 animate-spin shrink-0 self-center",
                                                isStuck(task.created_at) ? "text-amber-500" : "text-primary"
                                            )} />
                                        </div>
                                        <Progress
                                            value={getTaskProgress(task.step)}
                                            className={cn(
                                                "h-1 transition-all duration-1000",
                                                isStuck(task.created_at) ? "bg-amber-500/10" : "bg-primary/10"
                                            )}
                                        />
                                        {isStuck(task.created_at) && (
                                            <p className="text-[9px] text-amber-600/80 font-medium animate-pulse">
                                                Processamento demorado... tente cancelar se travar.
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="p-2 space-y-2 mt-1">
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest px-1">Concluídos recentemente</p>
                            {recentCompleted.length === 0 && !isLoading && (
                                <div className="p-4 text-center">
                                    <p className="text-xs text-muted-foreground italic">Nenhuma atividade recente</p>
                                </div>
                            )}

                            {recentCompleted.map((log) => (
                                <div key={log.id} className="group/completed flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-all relative">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                        log.status === 'success' ? "bg-primary/10" : "bg-destructive/10"
                                    )}>
                                        {getStatusIcon(log.status)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <p className={cn(
                                                "text-xs font-bold truncate",
                                                log.status === 'error' && "text-destructive"
                                            )}>
                                                {log.message}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] text-muted-foreground tabular-nums shrink-0 group-hover/completed:hidden">
                                                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                                                </span>
                                                <button
                                                    onClick={() => deleteMutation.mutate(log.id)}
                                                    className="hidden group-hover/completed:flex h-5 w-5 items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                                                    title="Remover"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground truncate italic">{log.source_title || 'Sistema'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </ScrollArea>

                <div className="p-3 border-t border-border/40 bg-muted/10">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-[10px] font-bold uppercase tracking-widest h-8"
                        onClick={() => window.location.href = '/logs'}
                    >
                        Ver Histórico Completo
                        <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                </div>
            </PopoverContent>
        </Popover >
    );
}
