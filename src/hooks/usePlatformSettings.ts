import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformSettingsApi } from '@/lib/api';
import { toast } from 'sonner';

export function usePlatformSettings() {
  const queryClient = useQueryClient();

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: () => platformSettingsApi.getAll(),
  });

  const saveSettings = useMutation({
    mutationFn: ({ platformId, credentials, isConnected, isAutoPublish }: { 
      platformId: string, 
      credentials: any, 
      isConnected: boolean,
      isAutoPublish: boolean 
    }) => platformSettingsApi.save(platformId, credentials, isConnected, isAutoPublish),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar: ' + error.message);
    }
  });

  const disconnectPlatform = useMutation({
    mutationFn: (platformId: string) => platformSettingsApi.disconnect(platformId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast.success('Plataforma desconectada!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao desconectar: ' + error.message);
    }
  });

  const connectedPlatforms = settings.filter(s => s.is_connected);

  return {
    settings,
    connectedPlatforms,
    isLoading,
    saveSettings,
    disconnectPlatform
  };
}
