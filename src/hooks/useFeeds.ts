import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedsApi, Feed } from '@/lib/api';
import { toast } from 'sonner';
import { handleError } from '@/lib/errorHandler';

export function useFeeds() {
    const queryClient = useQueryClient();

    const { data: feeds = [], isLoading } = useQuery({
        queryKey: ['feeds'],
        queryFn: feedsApi.getAll,
        refetchInterval: 30000,
    });

    const createFeed = useMutation({
        mutationFn: feedsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feeds'] });
            toast.success('Feed adicionado com sucesso!');
        },
        onError: (error: Error) => {
            handleError({
                context: 'CREATE_FEED',
                error,
                message: 'Erro ao adicionar feed'
            });
        },
    });

    const updateFeed = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Feed> }) =>
            feedsApi.update(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feeds'] });
            toast.success('Feed atualizado!');
        },
        onError: (error: Error) => {
            handleError({
                context: 'UPDATE_FEED',
                error,
                message: 'Erro ao atualizar feed'
            });
        },
    });

    const deleteFeed = useMutation({
        mutationFn: feedsApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feeds'] });
            toast.success('Feed removido');
        },
        onError: (error: Error) => {
            handleError({
                context: 'DELETE_FEED',
                error,
                message: 'Erro ao remover feed'
            });
        },
    });

    const processFeed = useMutation({
        mutationFn: feedsApi.processFeed,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['feeds'] });
            queryClient.invalidateQueries({ queryKey: ['feed-items'] });
            queryClient.invalidateQueries({ queryKey: ['logs'] });
            if (data.success) {
                toast.success(`Processamento concluído: ${data.itemsRewritten || 0} itens reescritos.`);
            } else {
                toast.error('Aviso: ' + (data.error || 'Nenhum item processado.'));
            }
        },
        onError: (error: Error) => {
            handleError({
                context: 'PROCESS_FEED',
                error,
                message: 'Erro no processamento do feed'
            });
        },
    });

    return {
        feeds,
        isLoading,
        createFeed,
        updateFeed,
        deleteFeed,
        processFeed,
    };
}
