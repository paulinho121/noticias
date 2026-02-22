import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { logsApi } from '@/lib/api';
import { BarChart3 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { subDays, format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function PerformanceChart() {
  const { data: logs = [] } = useQuery({
    queryKey: ['logs'],
    queryFn: logsApi.getAll,
  });

  // Generate last 7 days data
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayStart = startOfDay(date);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayLogs = logs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= dayStart && logDate < dayEnd;
      });

      return {
        name: format(date, 'EEE', { locale: ptBR }),
        posts: dayLogs.filter(l => l.status === 'success').length,
        errors: dayLogs.filter(l => l.status === 'error').length,
      };
    });
  }, [logs]);

  const hasData = logs.length > 0;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Performance Semanal</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Posts gerados nos últimos 7 dias</p>
        </div>
        {hasData && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-muted-foreground">Posts</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span className="text-muted-foreground">Erros</span>
            </div>
          </div>
        )}
      </div>

      {!hasData ? (
        <EmptyState
          icon={BarChart3}
          title="Sem dados de performance"
          description="O gráfico será preenchido conforme seus feeds processarem conteúdo."
          className="h-64 py-8"
        />
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={last7Days}>
              <defs>
                <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(222, 47%, 10%)',
                  border: '1px solid hsl(217, 33%, 17%)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)'
                }}
                labelStyle={{ color: 'hsl(210, 40%, 98%)' }}
                itemStyle={{ color: 'hsl(215, 20%, 55%)' }}
              />
              <Area
                type="monotone"
                dataKey="posts"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorPosts)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="errors"
                stroke="hsl(0, 84%, 60%)"
                fillOpacity={1}
                fill="url(#colorErrors)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
