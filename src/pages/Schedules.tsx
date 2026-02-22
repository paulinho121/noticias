import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  Edit,
  Loader2,
  Rss,
  RefreshCw,
  Zap,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Globe,
  Send,
  Monitor
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/ui/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card, CardContent } from "@/components/ui/card";
import { schedulesApi, feedsApi, logsApi, Schedule, Feed } from '@/lib/api';
import { useSchedules } from '@/hooks/useSchedules';
import { useFeeds } from '@/hooks/useFeeds';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const days = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];

export default function Schedules() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  // Hooks
  const { schedules, isLoading: schedulesLoading, updateSchedule, toggleSchedule, deleteSchedule } = useSchedules();
  const { feeds } = useFeeds();

  const { data: logs = [] } = useQuery({
    queryKey: ['logs'],
    queryFn: logsApi.getAll,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const getFeedById = (feedId: string): Feed | undefined => {
    return feeds.find(f => f.id === feedId);
  };

  const filteredSchedules = schedules.filter(schedule => {
    const feed = getFeedById(schedule.feed_id);
    if (!feed) return false;
    return feed.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getHealthStatus = (feedId: string) => {
    const feedLogs = logs.filter(l => l.feed_id === feedId);
    if (feedLogs.length === 0) return 'neutral';

    const lastLog = feedLogs[0];
    if (lastLog.message?.includes('Nenhuma reportagem encontrada') ||
      lastLog.message?.includes('Zero items found')) return 'warning';

    return lastLog.status === 'success' ? 'healthy' : 'error';
  };

  const processFeedMutation = useMutation({
    mutationFn: feedsApi.processFeed,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      if (data.success) {
        toast.success(`Processado! ${data.itemsFetched || 0} buscados, ${data.itemsRewritten || 0} reescritos.`);
      } else {
        toast.error('Erro: ' + data.error);
      }
    },
  });

  const handleEditClick = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingSchedule) return;
    try {
      await updateSchedule.mutateAsync({
        id: editingSchedule.id,
        updates: {
          schedule_type: editingSchedule.schedule_type,
          interval_minutes: editingSchedule.interval_minutes,
          schedule_time: editingSchedule.schedule_time,
          days: editingSchedule.days,
        },
      });
      setIsEditDialogOpen(false);
      toast.success('Configurações salvas!');
    } catch (e) {
      toast.error('Erro ao salvar agendamento');
    }
  };

  // Stats calculation
  const activeCount = schedules.filter(s => s.is_active).length;
  const healthyCount = activeCount > 0
    ? schedules.filter(s => s.is_active && getHealthStatus(s.feed_id) === 'healthy').length
    : 0;
  const healthRate = activeCount > 0 ? Math.round((healthyCount / activeCount) * 100) : 100;

  const nextExecution = schedules
    .filter(s => s.is_active && s.next_run)
    .sort((a, b) => new Date(a.next_run!).getTime() - new Date(b.next_run!).getTime())[0];

  const handleDayToggle = async (schedule: Schedule, day: string) => {
    const currentDays = schedule.days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];

    if (newDays.length === 0) return;

    try {
      await updateSchedule.mutateAsync({
        id: schedule.id,
        updates: { days: newDays },
      });
    } catch (e) {
      // Handled by hook
    }
  };

  if (schedulesLoading) {
    return (
      <MainLayout>
        <Header title="Agendamentos" subtitle="Configure a frequência de atualização" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header
        title="Automação & Agendamentos"
        subtitle="Gerencie a inteligência de processamento contínuo do seu ecossistema."
        onSearchChange={setSearchTerm}
      />

      <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-700">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card border-primary/20 bg-primary/5">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Automações Ativas</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold font-mono tracking-tighter">{activeCount}</h3>
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">de {schedules.length} canais</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-border/40">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Próximo Disparo</p>
                <h3 className="text-xl font-bold truncate max-w-[220px]">
                  {nextExecution?.next_run
                    ? format(new Date(nextExecution.next_run), "HH:mm 'hoje'", { locale: ptBR })
                    : 'Aguardando...'}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-primary/20 bg-primary/5">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Saúde da Integração</p>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold text-primary font-mono tracking-tighter">{healthRate}%</h3>
                  <Badge variant="outline" className="text-[10px] text-primary border-primary/20 font-black tracking-widest">OPERANTE</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {schedules.length === 0 ? (
          <div className="glass-card">
            <EmptyState
              icon={Calendar}
              title="Nenhuma automação configurada"
              description="As rotinas de IA são criadas junto com seus feeds. Comece adicionando seu primeiro canal de conteúdo."
            />
          </div>
        ) : filteredSchedules.length === 0 ? (
          <div className="glass-card">
            <EmptyState
              icon={Calendar}
              title="Nenhum fluxo encontrado"
              description="Ajuste os termos de busca para localizar automações específicas."
              action={{
                label: "Limpar Filtros",
                onClick: () => setSearchTerm('')
              }}
            />
          </div>
        ) : (
          <div className="glass-card overflow-hidden border-border/40 shadow-xl shadow-black/20">
            {/* Desktop Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 border-b border-border bg-muted/20 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/80">
              <div className="col-span-4">Fluxo / Fonte</div>
              <div className="col-span-2 text-center">Frequência</div>
              <div className="col-span-2 text-center">Ciclo Semanal</div>
              <div className="col-span-2 text-center">Status de Execução</div>
              <div className="col-span-1 text-center">Ativo</div>
              <div className="col-span-1"></div>
            </div>

            <div className="divide-y divide-border/40">
              {filteredSchedules.map((schedule) => {
                const feed = getFeedById(schedule.feed_id);
                const isProcessing = processFeedMutation.isPending && processFeedMutation.variables === schedule.feed_id;
                const health = getHealthStatus(schedule.feed_id);

                return (
                  <div
                    key={schedule.id}
                    className={cn(
                      "flex flex-col md:grid md:grid-cols-12 gap-4 px-4 py-5 md:px-6 items-center transition-all duration-300 group hover:bg-muted/10 relative",
                      !schedule.is_active && "opacity-60 grayscale-[0.5]"
                    )}
                  >
                    {/* Health Indicator Line */}
                    <div className={cn(
                      "absolute left-0 top-0 bottom-0 w-0.5 transition-all",
                      health === 'healthy' ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" :
                        health === 'error' ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" : "bg-muted-foreground/20"
                    )} />

                    {/* Feed Info */}
                    <div className="w-full md:col-span-4 flex items-center gap-3 md:gap-4">
                      <div className={cn(
                        "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 border border-transparent transition-all",
                        schedule.is_active ? "bg-primary/10 border-primary/20 group-hover:bg-primary/20" : "bg-muted"
                      )}>
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin text-primary" />
                        ) : (
                          <Rss className={cn(
                            "w-4 h-4 md:w-5 md:h-5",
                            schedule.is_active ? "text-primary" : "text-muted-foreground"
                          )} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-foreground truncate">{feed?.name || 'Fonte Excluída'}</p>
                          {health === 'healthy' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary animate-in zoom-in duration-500" />
                          ) : health === 'error' ? (
                            <AlertCircle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                          ) : health === 'warning' ? (
                            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold text-amber-500 animate-in fade-in">
                              <AlertCircle className="w-2.5 h-2.5" />
                              SEM NOTÍCIAS NOVAS
                            </div>
                          ) : null}
                          {feed?.target_platform && (
                            <div className="flex items-center opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all ml-1" title={`Destino: ${feed.target_platform}`}>
                              {feed.target_platform === 'wordpress' && <Globe className="w-3 h-3 text-blue-500" />}
                              {feed.target_platform === 'blogger' && <span className="text-[10px]">🅱️</span>}
                              {feed.target_platform === 'custom_api' && <Send className="w-3 h-3 text-primary" />}
                              {feed.target_platform === 'local' && <Monitor className="w-3 h-3 text-muted-foreground" />}
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate opacity-70 flex items-center gap-1 mt-1 font-medium uppercase tracking-wider">
                          <Clock className="w-3 h-3" />
                          {schedule.schedule_type === 'interval' ? `A cada ${schedule.interval_minutes} min` : `Fixo às ${schedule.schedule_time}`}
                        </p>
                      </div>
                      <div className="md:hidden">
                        <Switch
                          checked={schedule.is_active}
                          onCheckedChange={() => toggleSchedule.mutate(schedule.id)}
                          className="data-[state=checked]:bg-primary scale-90"
                        />
                      </div>
                    </div>

                    {/* Frequency (Desktop Only / Mobile Secondary) */}
                    <div className="hidden md:flex md:col-span-2 justify-center">
                      <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-full border border-border/50 group-hover:border-primary/30 transition-colors">
                        <Clock className="w-3.5 h-3.5 text-primary/60" />
                        <span className="text-xs font-bold text-foreground font-mono tracking-tighter">
                          {schedule.schedule_type === 'interval'
                            ? `${schedule.interval_minutes}m`
                            : schedule.schedule_time || '--:--'
                          }
                        </span>
                      </div>
                    </div>

                    {/* Days Mapping */}
                    <div className="w-full md:w-auto md:col-span-2 flex justify-between md:justify-center items-center">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 md:hidden">Ciclo Semanal</span>
                      <div className="flex gap-1">
                        {days.map((d) => (
                          <button
                            key={d}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDayToggle(schedule, d);
                            }}
                            className={cn(
                              "w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black transition-all",
                              schedule.days?.includes(d)
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground/30 border border-border/40"
                            )}
                            title={d.toUpperCase()}
                          >
                            {d.charAt(0).toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Runtime Status */}
                    <div className="w-full md:w-auto md:col-span-2 flex justify-between md:justify-center items-center py-2 md:py-0 border-y border-border/20 md:border-none">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 md:hidden">Status de Execução</span>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] text-muted-foreground/60 font-bold uppercase tracking-tighter">Última</span>
                          <span className="text-xs font-semibold tabular-nums">
                            {schedule.last_run ? format(new Date(schedule.last_run), "HH:mm", { locale: ptBR }) : '--:--'}
                          </span>
                        </div>
                        <ArrowRight className="w-3 h-3 text-muted-foreground/30" />
                        <div className="flex flex-col items-start">
                          <span className="text-[9px] text-primary/60 font-bold uppercase tracking-tighter">Próxima</span>
                          <span className="text-xs font-semibold tabular-nums text-primary/80">
                            {schedule.next_run && schedule.is_active ? format(new Date(schedule.next_run), "HH:mm", { locale: ptBR }) : '--:--'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Switch (Desktop Only) */}
                    <div className="hidden md:flex md:col-span-1 justify-center">
                      <div className="relative">
                        <Switch
                          checked={schedule.is_active}
                          onCheckedChange={() => toggleSchedule.mutate(schedule.id)}
                          className="data-[state=checked]:bg-primary"
                        />
                        {schedule.is_active && <span className="absolute -top-1 -right-1 h-2 w-2 bg-primary rounded-full animate-pulse border-2 border-background"></span>}
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="absolute top-4 right-4 md:relative md:top-0 md:right-0 md:col-span-1 flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 md:opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10 hover:text-primary rounded-xl"
                          >
                            <MoreVertical className="w-5 h-5 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 glass-card border-primary/20">
                          <DropdownMenuItem
                            className="gap-3 py-2.5 font-bold text-xs"
                            onClick={() => processFeedMutation.mutate(schedule.feed_id)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-primary" />}
                            Forçar Gatilho Manual
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-3 py-2.5 font-bold text-xs"
                            onClick={() => handleEditClick(schedule)}
                          >
                            <Edit className="w-4 h-4 text-blue-500" />
                            Redefinir Automação
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-border/40" />
                          <DropdownMenuItem
                            className="gap-3 py-2.5 text-destructive font-black text-xs uppercase tracking-widest"
                            onClick={() => deleteSchedule.mutate(schedule.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                            Encerrar Ciclo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Professional Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        {editingSchedule && (
          <DialogContent className="sm:max-w-[480px] glass-card border-primary/20 bg-background/95 backdrop-blur-2xl p-0 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border/40">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold tracking-tight">Otimizar Automação</DialogTitle>
                    <DialogDescription className="text-xs">Ajuste o pulso de processamento deste canal.</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>

            <div className="p-8 space-y-8">
              {/* Type Selection */}
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">Modo de Disparo</Label>
                <Tabs
                  value={editingSchedule.schedule_type}
                  onValueChange={(v) => setEditingSchedule({ ...editingSchedule, schedule_type: v as any })}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-2 p-1 bg-muted/30">
                    <TabsTrigger value="interval" className="data-[state=active]:bg-background font-bold text-xs gap-2">
                      <RefreshCw className="w-3.5 h-3.5" /> Intervalo
                    </TabsTrigger>
                    <TabsTrigger value="fixed" className="data-[state=active]:bg-background font-bold text-xs gap-2">
                      <Calendar className="w-3.5 h-3.5" /> Horário Fixo
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Value Input */}
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">Configuração Temporal</Label>
                {editingSchedule.schedule_type === 'interval' ? (
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                      <Input
                        type="number"
                        value={editingSchedule.interval_minutes || 60}
                        onChange={(e) => setEditingSchedule({ ...editingSchedule, interval_minutes: parseInt(e.target.value) })}
                        className="bg-muted/30 border-border/40 text-lg font-bold h-12 pl-10"
                      />
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50" />
                    </div>
                    <span className="text-sm font-bold text-muted-foreground uppercase">Minutos</span>
                  </div>
                ) : (
                  <Input
                    type="time"
                    value={editingSchedule.schedule_time || "09:00"}
                    onChange={(e) => setEditingSchedule({ ...editingSchedule, schedule_time: e.target.value })}
                    className="bg-muted/30 border-border/40 text-xl font-black h-14 text-center tracking-widest focus:ring-primary/40 transition-all"
                  />
                )}
              </div>

              {/* Days Selection */}
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">Ciclo de Atividade</Label>
                <ToggleGroup
                  type="multiple"
                  className="justify-between"
                  value={editingSchedule.days}
                  onValueChange={(days) => days.length > 0 && setEditingSchedule({ ...editingSchedule, days })}
                >
                  {['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map((d) => (
                    <ToggleGroupItem
                      key={d}
                      value={d}
                      className="w-10 h-10 rounded-lg border border-border/40 font-bold text-xs uppercase transition-all data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-transparent"
                    >
                      {d.slice(0, 2)}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </div>

            <DialogFooter className="p-6 bg-muted/20 border-t border-border/40">
              <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="font-bold text-xs uppercase tracking-wider">Cancelar</Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateSchedule.isPending}
                className="bg-primary text-primary-foreground hover:opacity-90 px-8 font-black text-xs uppercase tracking-[0.15em] shadow-lg shadow-primary/20"
              >
                {updateSchedule.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar Mudanças'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </MainLayout>
  );
}
