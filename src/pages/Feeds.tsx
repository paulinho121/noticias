import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Rss,
  MoreVertical,
  Play,
  Trash2,
  Edit,
  ExternalLink,
  Image,
  Clock,
  Folder,
  Loader2,
  RefreshCw,
  Sparkles,
  Plus,
  Globe,
  Send,
  Monitor,
  Star
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFeeds } from '@/hooks/useFeeds';
import { useSchedules } from '@/hooks/useSchedules';
import { useCategories } from '@/hooks/useCategories';
import { useDebounce } from '@/hooks/useDebounce';
import { useFavorites } from '@/hooks/useFavorites';
import { Feed, Schedule, Category } from '@/lib/api';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const statusBadge = {
  draft: { label: 'Rascunho', variant: 'secondary' as const },
  published: { label: 'Publicado', variant: 'default' as const },
  scheduled: { label: 'Agendado', variant: 'outline' as const },
};

export default function Feeds() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [processingFeedId, setProcessingFeedId] = useState<string | null>(null);
  const [newFeed, setNewFeed] = useState({
    name: '',
    url: '',
    category_id: '',
    post_status: 'draft' as 'draft' | 'published' | 'scheduled',
    extract_images: true,
    custom_prompt: '',
    is_pending_review: false,
    source_type: 'rss' as 'rss' | 'keywords',
    keywords: '',
    credit_source: false,
    image_credit_text: '',
    image_engine: 'scraped' as 'scraped' | 'google_gemini' | 'dalle' | 'gemini_2_5',
    generate_highlights: true,
    target_platform: 'wordpress' as 'wordpress' | 'blogger' | 'custom_api' | 'local',
    interval_minutes: 60,
  });

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  // Queries using Hooks
  const { feeds, isLoading: feedsLoading, processFeed, createFeed, updateFeed, deleteFeed: removeFeed } = useFeeds();
  const { schedules, toggleSchedule, createSchedule } = useSchedules();
  const { categories, createCategory, syncCategories } = useCategories();

  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Debounce search term para melhor performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Gerenciar feeds favoritos
  const { isFavorite, toggle: toggleFavorite } = useFavorites();

  const filteredFeeds = feeds.filter(feed => {
    // Filtra por termo de busca
    const matchesSearch = debouncedSearchTerm === '' ||
      feed.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      feed.url.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

    return matchesSearch;
  }).sort((a, b) => {
    // Favoritos primeiro
    const aIsFav = isFavorite(a.id);
    const bIsFav = isFavorite(b.id);
    if (aIsFav && !bIsFav) return -1;
    if (!aIsFav && bIsFav) return 1;
    return 0;
  });

  const handleAddFeed = async () => {
    const isRss = newFeed.source_type === 'rss';
    const hasRequiredFields = newFeed.name && (isRss ? newFeed.url : newFeed.keywords);

    if (!hasRequiredFields) {
      toast.error('Preencha todos os campos obrigatórios (Nome e ' + (isRss ? 'URL' : 'Palavras-chave') + ')');
      return;
    }

    try {
      const feed = await createFeed.mutateAsync({
        name: newFeed.name,
        url: isRss ? newFeed.url : `creative://${newFeed.name.toLowerCase().replace(/\s+/g, '-')}`,
        category_id: newFeed.category_id || null,
        author_id: null,
        post_status: newFeed.post_status,
        auto_publish: !newFeed.is_pending_review,
        extract_images: newFeed.extract_images,
        image_selector: null,
        avoid_logo: true,
        is_active: true,
        custom_prompt: newFeed.custom_prompt || null,
        is_pending_review: newFeed.is_pending_review,
        source_type: newFeed.source_type,
        keywords: newFeed.source_type === 'keywords' ? newFeed.keywords : null,
        credit_source: newFeed.credit_source,
        image_credit_text: newFeed.image_credit_text || null,
        image_engine: newFeed.image_engine,
        generate_highlights: newFeed.generate_highlights,
        target_platform: newFeed.target_platform,
      });

      // Create default schedule
      await createSchedule.mutateAsync({
        feed_id: feed.id,
        schedule_type: 'interval',
        schedule_time: null,
        interval_minutes: newFeed.interval_minutes || 60,
        days: ['seg', 'ter', 'qua', 'qui', 'sex'],
        last_run: null,
        next_run: null,
        is_active: true,
      });

      setIsAddDialogOpen(false);
      resetNewFeed();
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleUpdateFeed = async () => {
    if (!editingFeed) return;
    try {
      await updateFeed.mutateAsync({
        id: editingFeed.id,
        updates: editingFeed
      });
      // Update schedule too
      const schedule = getScheduleByFeedId(editingFeed.id);
      if (schedule && (editingFeed as any).interval_minutes) {
        await updateSchedule.mutateAsync({
          id: schedule.id,
          updates: { interval_minutes: (editingFeed as any).interval_minutes }
        });
      }

      setIsEditDialogOpen(false);
      setEditingFeed(null);
    } catch (e) {
      // Error handled by hook
    }
  };

  const resetNewFeed = () => {
    setNewFeed({
      name: '',
      url: '',
      category_id: '',
      post_status: 'draft',
      extract_images: true,
      custom_prompt: '',
      is_pending_review: false,
      source_type: 'rss',
      keywords: '',
      credit_source: false,
      image_credit_text: '',
      image_engine: 'scraped',
      generate_highlights: true,
      target_platform: 'wordpress',
      interval_minutes: 60,
    });
  };

  const openEditDialog = (feed: Feed) => {
    const schedule = getScheduleByFeedId(feed.id);
    setEditingFeed({
      ...feed,
      interval_minutes: schedule?.interval_minutes || 60
    } as any);
    setIsEditDialogOpen(true);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const slug = newCategoryName.toLowerCase().trim().replace(/\s+/g, '-');
      const cat = await createCategory.mutateAsync({ name: newCategoryName, slug });
      setNewFeed(prev => ({ ...prev, category_id: cat.id }));
      setNewCategoryName('');
      setIsCreatingCategory(false);
    } catch (e) {
      // Handled by hook
    }
  };

  const handleProcessFeed = async (feedId: string) => {
    setProcessingFeedId(feedId);
    await processFeed.mutateAsync(feedId);
    setProcessingFeedId(null);
  };

  const getScheduleByFeedId = (feedId: string): Schedule | undefined => {
    return schedules.find(s => s.feed_id === feedId);
  };

  const getCategoryById = (categoryId: string | null): Category | undefined => {
    if (!categoryId) return undefined;
    return categories.find(c => c.id === categoryId);
  };

  if (feedsLoading) {
    return (
      <MainLayout>
        <Header title="Feeds RSS" subtitle="Gerencie suas fontes de conteúdo" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header
        title="Feeds RSS"
        subtitle="Gerencie suas fontes de conteúdo"
        showAddButton
        addButtonText="Novo Feed"
        onAddClick={() => setIsAddDialogOpen(true)}
        onSearchChange={setSearchTerm}
      />

      <div className="p-4 md:p-8">
        {feeds.length === 0 ? (
          <div className="border border-border rounded-lg bg-card shadow-sm">
            <EmptyState
              icon={Rss}
              title="Nenhum feed configurado"
              description="Adicione seus feeds RSS para começar a importar e reescrever conteúdo automaticamente com IA."
              action={{
                label: "Adicionar Primeiro Feed",
                onClick: () => setIsAddDialogOpen(true)
              }}
            />
          </div>
        ) : filteredFeeds.length === 0 ? (
          <div className="border border-border rounded-lg bg-card shadow-sm">
            <EmptyState
              icon={Rss}
              title="Nenhum feed encontrado"
              description="Tente ajustar sua busca para encontrar o feed desejado."
              action={{
                label: "Limpar Busca",
                onClick: () => setSearchTerm('')
              }}
            />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            {/* Desktop Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 border-b border-border bg-muted/20 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
              <div className="col-span-4">Feed / URL</div>
              <div className="col-span-2 text-center">Categoria</div>
              <div className="col-span-2 text-center">Agendamento</div>
              <div className="col-span-2 text-center">Modo</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-1"></div>
            </div>

            <div className="divide-y divide-border/60">
              {filteredFeeds.map((feed) => {
                const schedule = getScheduleByFeedId(feed.id);
                const category = getCategoryById(feed.category_id);
                const status = statusBadge[feed.post_status];
                const isProcessing = processingFeedId === feed.id;

                return (
                  <div
                    key={feed.id}
                    className="flex flex-col md:grid md:grid-cols-12 gap-3 md:gap-4 px-4 py-4 md:px-6 md:py-4 items-center hover:bg-muted/10 transition-colors group relative"
                  >
                    {/* Feed Info & Header on Mobile */}
                    <div className="w-full md:col-span-4 flex items-center gap-3 md:gap-4">
                      <div className={cn(
                        "w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 transition-all",
                        schedule?.is_active ? "bg-primary/10" : "bg-muted"
                      )}>
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin text-primary" />
                        ) : (
                          <Rss className={cn(
                            "w-4 h-4 md:w-5 md:h-5",
                            schedule?.is_active ? "text-primary" : "text-muted-foreground"
                          )} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm md:text-base text-foreground truncate">{feed.name}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 hover:bg-transparent shrink-0"
                            onClick={() => toggleFavorite(feed.id)}
                          >
                            <Star className={cn(
                              "w-4 h-4 transition-all",
                              isFavorite(feed.id)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground hover:text-yellow-400"
                            )} />
                          </Button>
                          {feed.target_platform && (
                            <div className="opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all shrink-0" title={`Postar em: ${feed.target_platform}`}>
                              {feed.target_platform === 'wordpress' && <Globe className="w-3.5 h-3.5 text-blue-500" />}
                              {feed.target_platform === 'blogger' && <span className="text-xs">🅱️</span>}
                              {feed.target_platform === 'custom_api' && <Send className="w-3.5 h-3.5 text-primary" />}
                              {feed.target_platform === 'local' && <Monitor className="w-3.5 h-3.5 text-muted-foreground" />}
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] md:text-xs text-muted-foreground truncate opacity-70">{feed.url}</p>

                        {/* Mobile Only: Category & Schedule badges */}
                        <div className="flex md:hidden items-center gap-2 mt-2">
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/40 border border-border/50">
                            <Folder className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[9px] font-medium text-muted-foreground">{category?.name || 'Geral'}</span>
                          </div>
                          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/40 border border-border/50">
                            <Clock className="w-3 h-3 text-primary/60" />
                            <span className="text-[9px] font-medium text-muted-foreground">{schedule?.schedule_type === 'interval' ? `${schedule.interval_minutes}m` : schedule?.schedule_time || 'Manual'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Category (Desktop Only) */}
                    <div className="hidden md:flex md:col-span-2 justify-center">
                      <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/30 border border-border/50">
                        <Folder className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-foreground truncate max-w-[80px]">{category?.name || 'Geral'}</span>
                      </div>
                    </div>

                    {/* Schedule (Desktop Only) */}
                    <div className="hidden md:flex md:col-span-2 justify-center">
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground/80">
                        <Clock className="w-3.5 h-3.5 text-primary/60" />
                        {schedule?.schedule_type === 'interval'
                          ? `${schedule.interval_minutes}m`
                          : schedule?.schedule_time || 'Manual'
                        }
                      </div>
                    </div>

                    {/* Status Badge (Desktop/Mobile) */}
                    <div className="w-full md:col-span-2 flex items-center justify-between md:justify-center mt-2 md:mt-0 pt-2 md:pt-0 border-t border-border/40 md:border-none">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground md:hidden">Modo</span>
                      <Badge
                        variant={feed.auto_publish ? "outline" : status.variant}
                        className={cn(
                          "text-[9px] md:text-[10px] font-bold uppercase py-0.5 h-5 gap-1 tracking-wider",
                          feed.auto_publish ? "bg-primary/10 text-primary border-primary/20" : ""
                        )}
                      >
                        {feed.auto_publish && <Sparkles className="w-2.5 h-2.5" />}
                        {feed.auto_publish ? 'Auto Pilot' : status.label}
                      </Badge>
                    </div>

                    {/* Toggle */}
                    <div className="w-full md:col-span-1 flex items-center justify-between md:justify-center mt-1 md:mt-0">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground md:hidden">Auto-Sync</span>
                      <Switch
                        checked={schedule?.is_active || false}
                        onCheckedChange={() => schedule && toggleSchedule.mutate(schedule.id)}
                        className="scale-75 md:scale-100"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex md:col-span-1 justify-end w-full md:w-auto mt-2 md:mt-0 border-t border-border/40 md:border-none pt-2 md:pt-0">
                      <div className="flex items-center justify-between w-full md:justify-end">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground md:hidden">Opções</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 md:px-2 rounded-lg md:opacity-0 group-hover:opacity-100 transition-opacity bg-muted/30 md:bg-transparent"
                            >
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                              <span className="ml-2 md:hidden text-xs font-semibold">Menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 p-2">
                            <DropdownMenuLabel className="text-[10px] uppercase text-muted-foreground/60 px-2 py-1">Ações Rápidas</DropdownMenuLabel>
                            <DropdownMenuItem
                              className="gap-3 py-2 cursor-pointer focus:bg-primary/5"
                              onClick={() => handleProcessFeed(feed.id)}
                              disabled={isProcessing}
                            >
                              {isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <Play className="w-4 h-4 text-primary" />
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="text-xs font-bold">Sincronizar Agora</span>
                                <span className="text-[9px] text-muted-foreground">Forçar busca de novos posts</span>
                              </div>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className="gap-3 py-2 cursor-pointer"
                              onClick={() => openEditDialog(feed)}
                            >
                              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <Edit className="w-4 h-4 text-blue-500" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold">Configurações</span>
                                <span className="text-[9px] text-muted-foreground">Editar regras e automação</span>
                              </div>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator className="my-1 bg-border/40" />

                            <DropdownMenuItem
                              className="gap-3 py-2 cursor-pointer text-destructive focus:bg-destructive/5 focus:text-destructive"
                              onClick={() => removeFeed.mutate(feed.id)}
                            >
                              <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                                <Trash2 className="w-4 h-4" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold">Excluir Projeto</span>
                                <span className="text-[9px] opacity-70">Ação irreversível</span>
                              </div>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Feed Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-none bg-transparent shadow-none">
          <div className="glass-card flex flex-col max-h-[90vh] border-primary/20 bg-background/95 backdrop-blur-2xl">
            <DialogHeader className="p-6 border-b border-border/40">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Rss className="w-4 h-4 text-primary" />
                </div>
                <DialogTitle className="text-xl font-bold">Configurar Novo Feed</DialogTitle>
              </div>
              <DialogDescription className="text-muted-foreground/80">
                Ajuste as configurações para sua nova automação de conteúdo inteligente.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 px-6">
              <div className="py-6 space-y-8">
                {/* Section: Base Configuration */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
                    <Folder className="w-3 h-3" />
                    Configuração Base
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Tipo de Fonte</Label>
                      <Tabs
                        defaultValue="rss"
                        value={newFeed.source_type}
                        onValueChange={(v) => setNewFeed(prev => ({ ...prev, source_type: v as 'rss' | 'keywords' }))}
                        className="w-full"
                      >
                        <TabsList className="grid grid-cols-2 w-full bg-muted/30 p-1">
                          <TabsTrigger value="rss" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                            <Rss className="w-3.5 h-3.5" />
                            RSS Feed
                          </TabsTrigger>
                          <TabsTrigger value="keywords" className="gap-2 data-[state=active]:bg-background data-[state=active]:text-accent data-[state=active]:shadow-sm transition-all">
                            <Sparkles className="w-3.5 h-3.5" />
                            Palavras-Chave
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground/70">Nome do Projeto *</Label>
                        <Input
                          id="name"
                          placeholder="Ex: TechCrunch Brasil"
                          className="bg-muted/20 border-border/40 focus:border-primary/40 focus:ring-primary/20 transition-all"
                          value={newFeed.name}
                          onChange={(e) => setNewFeed(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-muted-foreground/70">Categoria</Label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => syncCategories.mutate()}
                              className="text-[10px] text-primary hover:underline flex items-center gap-1"
                              disabled={syncCategories.isPending}
                            >
                              {syncCategories.isPending ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
                              Sincronizar WP
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsCreatingCategory(!isCreatingCategory)}
                              className="text-[10px] text-primary hover:underline flex items-center gap-1"
                            >
                              <Plus className="w-2.5 h-2.5" />
                              {isCreatingCategory ? 'Cancelar' : 'Nova'}
                            </button>
                          </div>
                        </div>

                        {isCreatingCategory ? (
                          <div className="flex gap-2 animate-in slide-in-from-top-1 duration-200">
                            <Input
                              placeholder="Nome da categoria"
                              className="h-9 text-xs bg-muted/20"
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && handleCreateCategory()}
                            />
                            <Button size="sm" className="h-9 px-3" onClick={handleCreateCategory} disabled={createCategory.isPending}>
                              {createCategory.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Ok'}
                            </Button>
                          </div>
                        ) : (
                          <Select
                            value={newFeed.category_id}
                            onValueChange={(value) => setNewFeed(prev => ({ ...prev, category_id: value }))}
                          >
                            <SelectTrigger className="bg-muted/20 border-border/40 h-10">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              <SelectItem value="none">Nenhuma (Geral)</SelectItem>
                              {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>

                    {newFeed.source_type === 'rss' ? (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <Label htmlFor="url" className="text-xs font-semibold text-muted-foreground/70">URL do Feed RSS *</Label>
                        <Input
                          id="url"
                          placeholder="https://example.com/feed.xml"
                          className="bg-muted/20 border-border/40"
                          value={newFeed.url || ''}
                          onChange={(e) => setNewFeed(prev => ({ ...prev, url: e.target.value }))}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <Label htmlFor="keywords" className="text-xs font-semibold text-muted-foreground/70">Tópicos para Geração *</Label>
                        <Textarea
                          id="keywords"
                          placeholder="Ex: inteligencia artificial, web3, saas marketing..."
                          className="bg-muted/20 border-border/40 resize-none min-h-[100px]"
                          value={newFeed.keywords || ''}
                          onChange={(e) => setNewFeed(prev => ({ ...prev, keywords: e.target.value }))}
                        />
                        <p className="text-[10px] text-muted-foreground/60 italic">
                          A IA criará artigos exclusivos baseados nestes temas.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="bg-border/40" />

                {/* Section: Editorial Intelligence */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-accent uppercase tracking-[0.2em]">
                    <Sparkles className="w-3 h-3" />
                    Inteligência Editorial
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground/70">Motor de Imagem AI</Label>
                      <Select
                        value={newFeed.image_engine}
                        onValueChange={(v) => setNewFeed(prev => ({ ...prev, image_engine: v as any }))}
                      >
                        <SelectTrigger className="bg-muted/20 border-border/40">
                          <SelectValue placeholder="Selecione o motor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scraped">Raspagem (Feed Original)</SelectItem>
                          <SelectItem value="google_gemini">Google Gemini (Imagen 3)</SelectItem>
                          <SelectItem value="gemini_2_5">Gemini 2.5 Flash Image (Novo)</SelectItem>
                          <SelectItem value="dalle">DALL-E 3 (OpenAI)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground/70">Plataforma de Destino</Label>
                      <Select
                        value={newFeed.target_platform}
                        onValueChange={(v) => setNewFeed(prev => ({ ...prev, target_platform: v as any }))}
                      >
                        <SelectTrigger className="bg-primary/5 border-primary/20 shadow-sm font-bold text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass-card border-primary/20">
                          <SelectItem value="wordpress" className="gap-2 font-bold">
                            <div className="flex items-center gap-2">
                              <Globe className="w-3.5 h-3.5 text-blue-500" />
                              <span>WordPress</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="blogger" className="gap-2 font-bold">
                            <div className="flex items-center gap-2">
                              <span>🅱️</span>
                              <span>Blogger</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="custom_api" className="gap-2 font-bold">
                            <div className="flex items-center gap-2">
                              <Send className="w-3.5 h-3.5 text-primary" />
                              <span>Custom API / Webhook</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="local" className="gap-2 font-bold">
                            <div className="flex items-center gap-2">
                              <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>Apenas Local (Sem Postar)</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground/70">Status de Publicação</Label>
                      <Select
                        value={newFeed.post_status}
                        onValueChange={(value: 'draft' | 'published' | 'scheduled') =>
                          setNewFeed(prev => ({ ...prev, post_status: value }))
                        }
                      >
                        <SelectTrigger className="bg-muted/20 border-border/40">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Rascunho</SelectItem>
                          <SelectItem value="published">Publicado</SelectItem>
                          <SelectItem value="scheduled">Agendado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>



                  {/* Feature Toggles Card */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 group hover:border-primary/40 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Auto-Publicar (Auto Pilot)</p>
                          <p className="text-[10px] text-muted-foreground">Pular revisão manual e postar direto</p>
                        </div>
                      </div>
                      <Switch
                        checked={!newFeed.is_pending_review}
                        onCheckedChange={(checked) => setNewFeed(prev => ({ ...prev, is_pending_review: !checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/40 hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Image className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm font-sans tracking-tight">Extrair Imagens</p>
                          <p className="text-[10px] text-muted-foreground">Adiciona capas visuais aos artigos</p>
                        </div>
                      </div>
                      <Switch
                        checked={newFeed.extract_images}
                        onCheckedChange={(checked) => setNewFeed(prev => ({ ...prev, extract_images: checked }))}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/40 hover:border-accent/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                          <RefreshCw className="w-4 h-4 text-accent" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm tracking-tight">Destaques Automáticos</p>
                          <p className="text-[10px] text-muted-foreground">Gera resumo em bullet points (TL;DR)</p>
                        </div>
                      </div>
                      <Switch
                        checked={newFeed.generate_highlights}
                        onCheckedChange={(checked) => setNewFeed(prev => ({ ...prev, generate_highlights: checked }))}
                      />
                    </div>

                    {newFeed.extract_images && (
                      <div className="p-5 rounded-xl bg-muted/20 border border-border/40 animate-in fade-in slide-in-from-top-2 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center border border-border/60">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm">Crédito de Imagem</p>
                              <p className="text-[10px] text-muted-foreground">Atribuir autoria automaticamente</p>
                            </div>
                          </div>
                          <Switch
                            checked={newFeed.credit_source}
                            onCheckedChange={(checked) => setNewFeed(prev => ({ ...prev, credit_source: checked }))}
                          />
                        </div>
                        {newFeed.credit_source && (
                          <div className="animate-in fade-in zoom-in-95">
                            <Input
                              placeholder="Texto do crédito (ex: Reprodução / Fonte)"
                              value={newFeed.image_credit_text}
                              onChange={(e) => setNewFeed(prev => ({ ...prev, image_credit_text: e.target.value }))}
                              className="h-9 text-xs bg-background/50 border-border/60"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground/70">Frequência de Atualização</Label>
                    <Select
                      value={newFeed.interval_minutes.toString()}
                      onValueChange={(v) => setNewFeed(prev => ({ ...prev, interval_minutes: parseInt(v) }))}
                    >
                      <SelectTrigger className="bg-muted/20 border-border/40 h-10">
                        <SelectValue placeholder="Selecione o intervalo..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">A cada 10 minutos</SelectItem>
                        <SelectItem value="15">A cada 15 minutos</SelectItem>
                        <SelectItem value="30">A cada 30 minutos</SelectItem>
                        <SelectItem value="60">A cada 1 hora</SelectItem>
                        <SelectItem value="180">A cada 3 horas</SelectItem>
                        <SelectItem value="360">A cada 6 horas</SelectItem>
                        <SelectItem value="720">A cada 12 horas</SelectItem>
                        <SelectItem value="1440">Uma vez por dia</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground italic">Intervalo que o sistema buscará novos posts.</p>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="p-6 bg-muted/30 border-t border-border/40 flex items-center justify-end gap-3 mt-0">
              <Button
                variant="ghost"
                className="hover:bg-muted font-medium text-xs"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddFeed}
                disabled={createFeed.isPending}
                className="bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20 px-8 font-bold text-xs uppercase tracking-widest"
              >
                {createFeed.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Salvar Configuração'
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Feed Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-none bg-transparent shadow-none">
          {editingFeed && (
            <div className="glass-card flex flex-col max-h-[90vh] border-primary/20 bg-background/95 backdrop-blur-2xl">
              <DialogHeader className="p-6 border-b border-border/40">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Edit className="w-4 h-4 text-primary" />
                  </div>
                  <DialogTitle className="text-xl font-bold">Editar Feed: {editingFeed.name}</DialogTitle>
                </div>
              </DialogHeader>

              <ScrollArea className="flex-1 px-6">
                <div className="py-6 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground/70">Nome do Projeto</Label>
                      <Input
                        value={editingFeed.name}
                        onChange={(e) => setEditingFeed({ ...editingFeed, name: e.target.value })}
                        className="bg-muted/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground/70">Categoria</Label>
                      <Select
                        value={editingFeed.category_id || 'none'}
                        onValueChange={(v) => setEditingFeed({ ...editingFeed, category_id: v === 'none' ? null : v })}
                      >
                        <SelectTrigger className="bg-muted/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground/70">Motor de Imagem AI</Label>
                      <Select
                        value={editingFeed.image_engine}
                        onValueChange={(v) => setEditingFeed({ ...editingFeed, image_engine: v as any })}
                      >
                        <SelectTrigger className="bg-primary/5 border-primary/20 shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scraped">Raspagem (Feed Original)</SelectItem>
                          <SelectItem value="google_gemini" className="font-bold text-primary">✨ Google Gemini (Imagen 3)</SelectItem>
                          <SelectItem value="gemini_2_5" className="font-bold text-primary">🚀 Gemini 2.5 Flash Image (Novo)</SelectItem>
                          <SelectItem value="dalle">DALL-E 3 (OpenAI)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-muted-foreground/70">Plataforma de Destino</Label>
                      <Select
                        value={editingFeed.target_platform || 'wordpress'}
                        onValueChange={(v) => setEditingFeed({ ...editingFeed, target_platform: v as any })}
                      >
                        <SelectTrigger className="bg-primary/5 border-primary/20 shadow-sm font-bold text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass-card border-primary/20">
                          <SelectItem value="wordpress" className="gap-2 font-bold">
                            <div className="flex items-center gap-2">
                              <Globe className="w-3.5 h-3.5 text-blue-500" />
                              <span>WordPress</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="blogger" className="gap-2 font-bold">
                            <div className="flex items-center gap-2">
                              <span>🅱️</span>
                              <span>Blogger</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="custom_api" className="gap-2 font-bold">
                            <div className="flex items-center gap-2">
                              <Send className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Custom API / Webhook</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="local" className="gap-2 font-bold">
                            <div className="flex items-center gap-2">
                              <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>Apenas Local (Sem Postar)</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">Recomendado: Google Gemini para alta qualidade sem custo extra.</p>



                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/40">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold">Auto-Publicar</p>
                        <p className="text-[10px] text-muted-foreground">Pular revisão manual</p>
                      </div>
                      <Switch
                        checked={editingFeed.auto_publish}
                        onCheckedChange={(c) => setEditingFeed({ ...editingFeed, auto_publish: c })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-card border border-border/40">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold">Extrair Imagens</p>
                        <p className="text-[10px] text-muted-foreground">Buscar imagens do RSS</p>
                      </div>
                      <Switch
                        checked={editingFeed.extract_images}
                        onCheckedChange={(c) => setEditingFeed({ ...editingFeed, extract_images: c })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground/70">Frequência de Atualização</Label>
                    <Select
                      value={(editingFeed as any).interval_minutes?.toString() || "60"}
                      onValueChange={(v) => setEditingFeed({ ...editingFeed, interval_minutes: parseInt(v) } as any)}
                    >
                      <SelectTrigger className="bg-muted/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">A cada 10 minutos</SelectItem>
                        <SelectItem value="15">A cada 15 minutos</SelectItem>
                        <SelectItem value="30">A cada 30 minutos</SelectItem>
                        <SelectItem value="60">A cada 1 hora</SelectItem>
                        <SelectItem value="180">A cada 3 horas</SelectItem>
                        <SelectItem value="360">A cada 6 horas</SelectItem>
                        <SelectItem value="720">A cada 12 horas</SelectItem>
                        <SelectItem value="1440">Uma vez por dia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="p-6 bg-muted/30 border-t border-border/40">
                <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleUpdateFeed} className="px-8 font-bold">Salvar Alterações</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
