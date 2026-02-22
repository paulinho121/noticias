import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { RewrittenItemCard } from '@/components/dashboard/RewrittenItemCard';
import { useFeedItems } from '@/hooks/useFeedItems';
import { EmptyState } from '@/components/ui/empty-state';
import { CheckCircle2, Loader2, Search, Filter, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfessionalEditor } from '@/components/editor/ProfessionalEditor';
import { FeedItem, feedsApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';


export default function Review() {
    const [filter, setFilter] = useState<'pending' | 'ready' | 'published' | 'all'>('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingItem, setEditingItem] = useState<FeedItem | null>(null);
    const { items, isLoading, approveItem, updateItem, rewriteItem, readyToPublishItem, rejectItem, createItem } = useFeedItems();
    const { data: feeds = [] } = useQuery({ queryKey: ['feeds'], queryFn: feedsApi.getAll });

    const filteredItems = items.filter(item => {
        const matchesFilter =
            filter === 'all' ||
            (filter === 'pending' && (
                item.status === 'pending' ||
                item.status === 'success' ||
                item.status === 'processing'
            )) ||
            (filter === 'ready' && item.status === 'ready') ||
            (filter === 'published' && item.status === 'published');

        const matchesSearch = item.source_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.rewritten_title?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
        return matchesFilter && matchesSearch;
    });

    const pendingCount = items.filter(i =>
        i.status === 'pending' ||
        i.status === 'success' ||
        i.status === 'processing'
    ).length;
    const readyCount = items.filter(i => i.status === 'ready').length;
    const publishedCount = items.filter(i => i.status === 'published').length;

    return (
        <MainLayout>
            <Header
                title="Posts"
                subtitle="Aprove ou edite as postagens geradas pela IA"
                onSearchChange={setSearchTerm}
            />

            <div className="p-4 md:p-8 space-y-4 md:space-y-6">
                {/* Filters & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 relative z-20 overflow-hidden">
                    <Tabs value={filter} className="w-full md:w-auto" onValueChange={(v) => setFilter(v as any)}>
                        <TabsList className="bg-muted/30 p-1 border border-border/50 backdrop-blur-sm w-full md:w-auto justify-start overflow-x-auto no-scrollbar">
                            <TabsTrigger value="pending" className="gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer pointer-events-auto">
                                Pendentes
                                {pendingCount > 0 && (
                                    <Badge variant="secondary" className="px-1.5 h-4 min-w-[1.25rem] flex items-center justify-center rounded-full bg-primary/10 text-primary border-none text-[10px] font-bold pointer-events-none">
                                        {pendingCount}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="ready" className="gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer pointer-events-auto">
                                A Publicar
                                {readyCount > 0 && (
                                    <Badge variant="secondary" className="px-1.5 h-4 min-w-[1.25rem] flex items-center justify-center rounded-full bg-orange-500/10 text-orange-500 border-none text-[10px] font-bold pointer-events-none">
                                        {readyCount}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="published" className="gap-2 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer pointer-events-auto">
                                Publicados
                                {publishedCount > 0 && (
                                    <Badge variant="secondary" className="px-1.5 h-4 min-w-[1.25rem] flex items-center justify-center rounded-full bg-muted text-muted-foreground border-none text-[10px] font-bold pointer-events-none">
                                        {publishedCount}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="all" className="px-4 cursor-pointer pointer-events-auto">Ver Todos</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <Button
                        onClick={() => {
                            const tempId = `manual-${Date.now()}`;
                            setEditingItem({
                                id: tempId,
                                feed_id: feeds[0]?.id || '',
                                source_url: `manual://${tempId}`,
                                source_title: '',
                                source_content: '',
                                source_image: '',
                                rewritten_title: '',
                                rewritten_content: '',
                                status: 'pending',
                                created_at: new Date().toISOString(),
                            } as any);
                        }}
                        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all font-bold h-10 px-6 rounded-xl"
                    >
                        <Plus className="w-4 h-4" />
                        Nova Postagem
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="glass-card">
                        <EmptyState
                            icon={CheckCircle2}
                            title={filter === 'pending' ? "Tudo limpo!" : "Nenhum item encontrado"}
                            description={filter === 'pending' ? "Você não tem nenhuma postagem aguardando revisão no momento." : "Tente ajustar seus filtros de busca."}
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 relative z-10">
                        {filteredItems.map((item) => (
                            <RewrittenItemCard
                                key={item.id}
                                item={item}
                                onApprove={(id, updatedData, platformId) => {
                                    if (item.status === 'ready') {
                                        approveItem.mutate({ itemId: id, updatedData, platformId }, {
                                            onSuccess: () => setFilter('published')
                                        });
                                    } else {
                                        readyToPublishItem.mutate({ itemId: id, updatedData }, {
                                            onSuccess: () => setFilter('ready')
                                        });
                                    }
                                }}
                                onReject={(id) => rejectItem.mutate(id)}
                                onEdit={(item) => setEditingItem(item)}
                                onRewrite={rewriteItem.mutateAsync}
                            />
                        ))}
                    </div>
                )}
            </div>

            {editingItem && (
                <ProfessionalEditor
                    item={editingItem}
                    isOpen={!!editingItem}
                    onClose={() => setEditingItem(null)}
                    onSave={async (id, updates) => {
                        if (id.startsWith('manual-')) {
                            const newItem = await createItem.mutateAsync({
                                ...updates,
                                feed_id: updates.feed_id || feeds[0]?.id || '',
                                source_url: editingItem.source_url,
                                source_title: updates.rewritten_title || 'Postagem Manual',
                                source_content: updates.rewritten_content,
                                source_image: updates.rewritten_image,
                                status: 'ready', // Postagens manuais já vão para "A Publicar"
                            } as any);
                            setFilter('ready');
                        } else if (editingItem.status === 'ready') {
                            approveItem.mutate({
                                itemId: id,
                                updatedData: updates
                            }, {
                                onSuccess: () => setFilter('published')
                            });
                        } else {
                            readyToPublishItem.mutate({
                                itemId: id,
                                updatedData: updates
                            }, {
                                onSuccess: () => setFilter('ready')
                            });
                        }
                    }}
                    onRewrite={async (params) => {
                        let targetId = params.itemId;
                        if (targetId.startsWith('manual-')) {
                            // Criar item antes de reescrever se for manual
                            try {
                                const newItem = await createItem.mutateAsync({
                                    feed_id: params.feedId || editingItem.feed_id || feeds[0]?.id || '',
                                    source_url: editingItem.source_url,
                                    source_title: params.title || 'Postagem Manual',
                                    source_content: params.content,
                                    rewritten_title: params.title,
                                    rewritten_content: params.content,
                                    status: 'pending', // Pending para permitir processamento
                                    user_id: (await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser())).data.user?.id
                                } as any);

                                targetId = newItem.id;
                                setEditingItem(newItem); // Atualiza para o item real para próximas ações
                            } catch (e: any) {
                                console.error("Erro ao criar item manual para reescrita:", e);
                                throw new Error("Falha ao salvar rascunho inicial: " + e.message);
                            }
                        }
                        return rewriteItem.mutateAsync({ ...params, itemId: targetId });
                    }}
                />
            )}
        </MainLayout>
    );
}
