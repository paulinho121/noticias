import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulesApi, Schedule } from '@/lib/api';
import { toast } from 'sonner';

export function useSchedules() {
    const queryClient = useQueryClient();

    const { data: schedules = [], isLoading } = useQuery({
        queryKey: ['schedules'],
        queryFn: schedulesApi.getAll,
        refetchInterval: 10000,
    });

    const createSchedule = useMutation({
        mutationFn: schedulesApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
        },
        onError: (error: Error) => {
            toast.error('Erro ao criar agendamento: ' + error.message);
        },
    });

    const updateSchedule = useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Schedule> }) =>
            schedulesApi.update(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
        },
    });

    const toggleSchedule = useMutation({
        mutationFn: schedulesApi.toggleActive,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
            toast.success('Status do agendamento alterado');
        },
    });

    const deleteSchedule = useMutation({
        mutationFn: schedulesApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
        },
    });

    return {
        schedules,
        isLoading,
        createSchedule,
        updateSchedule,
        toggleSchedule,
        deleteSchedule,
    };
}
