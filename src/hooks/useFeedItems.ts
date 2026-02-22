import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedItemsApi, FeedItem } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useFeedItems(feedId?: string) {
    const queryClient = useQueryClient();

    const { data: items = [], isLoading } = useQuery({
        queryKey: feedId ? ['feed-items', feedId] : ['feed-items'],
        queryFn: () => feedId ? feedItemsApi.getByFeedId(feedId) : feedItemsApi.getAll(),
    });

    const readyToPublishItem = useMutation({
        mutationFn: async ({ itemId, updatedData }: { itemId: string, updatedData?: Partial<FeedItem> }) => {
            const updates: any = { status: 'ready' };
            if (updatedData) {
                if (updatedData.rewritten_title) updates.rewritten_title = updatedData.rewritten_title;
                if (updatedData.rewritten_content) updates.rewritten_content = updatedData.rewritten_content;
                if (updatedData.rewritten_image) updates.rewritten_image = updatedData.rewritten_image;
                if (updatedData.slug) updates.slug = updatedData.slug;
                if (updatedData.meta_description) updates.meta_description = updatedData.meta_description;
                if (updatedData.social_summary) updates.social_summary = updatedData.social_summary;
                if (updatedData.tags) updates.tags = updatedData.tags;
                if (updatedData.keywords) updates.keywords = updatedData.keywords;
            }
            const { error } = await supabase.from('feed_items').update(updates).eq('id', itemId);
            if (error) throw error;
            return { success: true };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feed-items'] });
            toast.success('Item enviado para revisão final (A Publicar)!');
        },
        onError: (error: Error) => {
            toast.error('Erro ao preparar item: ' + error.message);
        },
    });

    const rewriteItem = useMutation({
        mutationFn: async ({ itemId, title, content, tone, onlyImage, customImagePrompt, customSourceImageB64 }: { itemId: string, title: string, content: string, tone?: string, onlyImage?: boolean, customImagePrompt?: string, customSourceImageB64?: string }) => {
            const result = await feedItemsApi.rewriteItem(itemId, title, content, tone, onlyImage, customImagePrompt, customSourceImageB64);
            if (!result.success) {
                throw new Error(result.error || 'Erro desconhecido na reescrita');
            }
            return result;
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['feed-items'] });
            if (result.queued || result.status === 202) {
                toast.success('Processamento iniciado em segundo plano!', {
                    description: 'Você pode continuar trabalhando, o post será atualizado automaticamente.'
                });
            } else {
                toast.success('Conteúdo reescrito com sucesso!');
            }
        },
        onError: (error: Error) => {
            toast.error('Erro ao reescrever: ' + error.message);
        },
    });

    const approveItem = useMutation({
        mutationFn: async ({ itemId, updatedData, platformId }: { itemId: string; updatedData?: Partial<FeedItem>; platformId?: string }) => {
            // 0. Se houver dados editados ou o user_id for nulo, atualiza no banco
            const { data: currentUser } = await supabase.auth.getUser();
            const updates: any = {};
            if (updatedData) {
                if (updatedData.rewritten_title) updates.rewritten_title = updatedData.rewritten_title;
                if (updatedData.rewritten_content) updates.rewritten_content = updatedData.rewritten_content;
                if (updatedData.rewritten_image) updates.rewritten_image = updatedData.rewritten_image;
                if (updatedData.slug) updates.slug = updatedData.slug;
                if (updatedData.meta_description) updates.meta_description = updatedData.meta_description;
                if (updatedData.social_summary) updates.social_summary = updatedData.social_summary;
                if (updatedData.tags) updates.tags = updatedData.tags;
                if (updatedData.keywords) updates.keywords = updatedData.keywords;
            }
            
            // Garantir que o user_id esteja preenchido para evitar erros de RLS na Edge Function
            updates.user_id = currentUser?.user?.id;

            const { error: updateError } = await supabase
                .from('feed_items')
                .update(updates)
                .eq('id', itemId);

            if (updateError) throw new Error('Falha ao atualizar dados antes de publicar: ' + updateError.message);

            // 1. Verificar se o WordPress está ativado
            const { data: wpSettings } = await (supabase as any)
                .from('platform_settings')
                .select('*')
                .eq('platform_id', 'wordpress')
                .eq('user_id', currentUser?.user?.id)
                .eq('is_connected', true)
                .maybeSingle();

            const isWordpressEnabled = !!wpSettings;

            if (platformId === 'wordpress' || (!platformId && isWordpressEnabled)) {
                // 2. Se tiver WP conectado (e for o alvo ou o padrão), tenta publicar via Edge Function
                const result = await feedItemsApi.publishToWordpress(itemId);
                
                if (!result.success) {
                    throw new Error(result.error || 'Falha ao publicar no WordPress');
                }
                
                return { success: true, published_to: 'wordpress' };
            } else if (platformId === 'blogger') {
                const result = await feedItemsApi.publishToBlogger(itemId);
                if (!result.success) {
                    throw new Error(result.error || 'Falha ao publicar no Blogger');
                }
                return { success: true, published_to: 'blogger' };
            } else if (platformId && platformId !== 'local') {
                // Caso seja outra plataforma (API, etc) - Por enquanto simulamos ou enviamos sinal
                toast.info(`Publicação para ${platformId} iniciada (simulado)...`);
                
                const { data, error } = await supabase
                    .from('feed_items')
                    .update({ 
                        status: 'published', 
                        processed_at: new Date().toISOString(),
                        published_url: platformId === 'custom_api' ? 'https://notificado-via-api.com' : 'https://plataforma-externa.com'
                    })
                    .eq('id', itemId)
                    .select()
                    .single();

                if (error) throw error;
                return { success: true, published_to: platformId, data };
            } else {
                // 3. Se for local ou nenhuma plataforma selecionada/disponível
                const { data, error } = await supabase
                    .from('feed_items')
                    .update({ status: 'published', processed_at: new Date().toISOString() })
                    .eq('id', itemId)
                    .select()
                    .single();

                if (error) throw error;
                return { success: true, published_to: 'local', data };
            }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['feed-items'] });
            if (data.published_to === 'wordpress') {
                toast.success('Publicado no WordPress com sucesso!');
            } else if (data.published_to === 'local') {
                toast.success('Item marcado como publicado (apenas local)!');
            } else {
                toast.success(`Publicado em ${data.published_to} com sucesso!`);
            }
        },
        onError: (error: Error) => {
            console.error('Erro na aprovação:', error);
            toast.error('Erro ao aprovar: ' + error.message);
        },
    });

    const rejectItem = useMutation({
        mutationFn: async (itemId: string) => {
            const { error } = await supabase
                .from('feed_items')
                .update({ status: 'error' })
                .eq('id', itemId);
            if (error) throw error;
            return { success: true };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feed-items'] });
            toast.success('Item rejeitado com sucesso!');
        },
        onError: (error: Error) => {
            toast.error('Erro ao rejeitar: ' + error.message);
        },
    });

    const updateItem = useMutation({
        mutationFn: ({ id, ...updates }: { id: string } & Partial<FeedItem>) =>
            feedItemsApi.update(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feed-items'] });
            toast.success('Item atualizado com sucesso!');
        },
        onError: (error: Error) => {
            toast.error('Erro ao atualizar: ' + error.message);
        },
    });

    const createItem = useMutation({
        mutationFn: (item: Omit<FeedItem, 'id' | 'created_at'>) =>
            feedItemsApi.create(item),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feed-items'] });
            toast.success('Nova postagem criada com sucesso!');
        },
        onError: (error: Error) => {
            toast.error('Erro ao criar postagem: ' + error.message);
        },
    });

    return {
        items,
        isLoading,
        rewriteItem,
        approveItem,
        readyToPublishItem,
        updateItem,
        createItem,
        rejectItem,
    };
}
