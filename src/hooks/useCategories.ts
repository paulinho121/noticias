import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi, Category } from '@/lib/api';
import { toast } from 'sonner';

export function useCategories() {
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getAll,
  });

  const createCategory = useMutation({
    mutationFn: (newCat: { name: string; slug: string; external_id?: string | null }) => 
      categoriesApi.create(newCat),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria criada com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar categoria: ' + error.message);
    },
  });

  const syncCategories = useMutation({
    mutationFn: () => categoriesApi.syncWordPressCategories(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(`${data.count} categorias sincronizadas com o WordPress!`);
    },
    onError: (error: any) => {
      toast.error('Erro ao sincronizar categorias: ' + error.message);
    },
  });

  return {
    categories,
    isLoading,
    createCategory,
    syncCategories,
  };
}
