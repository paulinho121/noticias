import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import {
    Users,
    Ticket,
    Send,
    Activity,
    UserCheck,
    AlertCircle,
    MessageSquare,
    BarChart3,
    Search,
    Filter,
    ShieldAlert,
    Database,
    Download,
    Mail,
    Ban,
    ChevronRight,
    Lock,
    Unlock,
    Info,
    Loader2,
    Zap,
    Calendar,
    Wrench,
    Trash2,
    RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { maintenanceApi } from '@/lib/api';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Metric {
    total_users: number;
    active_now: number;
    open_tickets: number;
    total_feeds: number;
    queue_pending: number;
    queue_processing: number;
    queue_failed: number;
}

export default function MasterAdmin() {
    const [metrics, setMetrics] = useState<Metric | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [tickets, setTickets] = useState<any[]>([]);
    const [queueTasks, setQueueTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [announcement, setAnnouncement] = useState({ title: '', message: '' });

    // Messaging & Blocking States
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
    const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [directMessage, setDirectMessage] = useState({ title: '', message: '' });
    const [blockReason, setBlockReason] = useState('');
    const [isRepairing, setIsRepairing] = useState(false);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchMetrics, 30000); // 30s refresh
        return () => clearInterval(interval);
    }, []);

    const fetchMetrics = async () => {
        const { data, error } = await (supabase as any).rpc('get_saas_metrics');
        if (!error && data) setMetrics(data);
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            await fetchMetrics();

            // Fetch Enriched Users using the new RPC for security and performance
            const { data: enrichedUsers, error: userError } = await (supabase as any)
                .rpc('get_detailed_users');

            if (userError) throw userError;
            if (enrichedUsers) setUsers(enrichedUsers);

            // Fetch Tickets
            const { data: ticketData } = await (supabase as any)
                .from('support_tickets')
                .select('*, user_profiles:user_id(full_name, email)')
                .order('created_at', { ascending: false });
            if (ticketData) setTickets(ticketData);

            // Fetch Recent Queue Tasks
            const { data: queueData } = await (supabase as any)
                .from('processing_queue')
                .select('*, organizations(app_name)')
                .order('created_at', { ascending: false })
                .limit(10);
            if (queueData) setQueueTasks(queueData);

        } catch (error) {
            console.error('Master error:', error);
            toast.error('Erro ao carregar dados do console');
        } finally {
            setLoading(false);
        }
    };

    const sendAnnouncement = async () => {
        if (!announcement.title || !announcement.message) {
            toast.error('Preencha o título e a mensagem');
            return;
        }

        const { error } = await (supabase as any)
            .from('admin_notifications')
            .insert({
                title: announcement.title,
                message: announcement.message,
                type: 'info'
            });

        if (error) {
            toast.error('Erro ao enviar anúncio');
        } else {
            toast.success('Anúncio enviado para todos os usuários!');
            setAnnouncement({ title: '', message: '' });
        }
    };

    const sendTargetedMessage = async () => {
        if (!selectedUser || !directMessage.title || !directMessage.message) {
            toast.error('Preencha o título e a mensagem');
            return;
        }

        const { error } = await (supabase as any)
            .from('user_notifications')
            .insert({
                user_id: selectedUser.id,
                title: directMessage.title,
                message: directMessage.message,
                type: 'technical_support'
            });

        if (error) {
            toast.error('Erro ao enviar suporte técnico');
        } else {
            toast.success(`Suporte técnico enviado com sucesso para ${selectedUser.full_name || selectedUser.email}!`);
            setIsMessageDialogOpen(false);
            setDirectMessage({ title: '', message: '' });
        }
    };

    const toggleUserBlock = async () => {
        if (!selectedUser) return;

        const newBlockStatus = !selectedUser.is_blocked;
        const { error } = await (supabase as any)
            .from('user_profiles')
            .update({
                is_blocked: newBlockStatus,
                block_reason: newBlockStatus ? blockReason : null
            })
            .eq('id', selectedUser.id);

        if (error) {
            toast.error(`Erro ao ${newBlockStatus ? 'bloquear' : 'desbloquear'} usuário`);
        } else {
            toast.success(`Usuário ${newBlockStatus ? 'bloqueado' : 'desbloqueado'} com sucesso!`);
            setIsBlockDialogOpen(false);
            setBlockReason('');
            fetchData(); // Refresh list
        }
    };

    const deleteUser = async () => {
        if (!selectedUser) return;

        try {
            const { error } = await (supabase as any).rpc('delete_user_admin', {
                target_user_id: selectedUser.id
            });

            if (error) throw error;

            toast.success('Conta excluída com sucesso!');
            setIsDeleteDialogOpen(false);
            fetchData();
        } catch (error: any) {
            console.error('Delete error:', error);
            toast.error('Erro ao excluir conta: ' + error.message);
        }
    };

    const handleForceWorker = async () => {
        try {
            const tid = toast.loading('Despertando Worker de Fila...');
            const { data, error } = await (supabase as any).rpc('force_queue_worker_manually');

            if (error) throw error;

            toast.success('Worker disparado com sucesso!', { id: tid });
            fetchData(); // Atualiza a lista da fila
        } catch (error: any) {
            toast.error('Erro ao despertar worker: ' + error.message);
        }
    };

    const handleRepairDatabase = async () => {
        try {
            setIsRepairing(true);
            const tid = toast.loading('Executando migrações críticas...');
            const result = await maintenanceApi.runSqlOnce();
            if (result.success) {
                toast.success('Banco de dados reparado e atualizado!', { id: tid });
            } else {
                toast.error('Erro no reparo: ' + result.error, { id: tid });
            }
        } catch (error: any) {
            toast.error('Falha na comunicação: ' + error.message);
        } finally {
            setIsRepairing(false);
        }
    };

    const exportData = async (table: string) => {
        try {
            const { data, error } = await (supabase as any)
                .from(table)
                .select('*');

            if (error) throw error;
            if (!data) return;

            const csv = [
                Object.keys(data[0]).join(','),
                ...data.map((row: any) =>
                    Object.values(row).map(value =>
                        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
                    ).join(',')
                )
            ].join('\n');

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${table}_backup_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success(`Backup de ${table} gerado com sucesso!`);
        } catch (error) {
            toast.error('Erro ao gerar backup');
            console.error(error);
        }
    };

    const calculateDaysLeft = (expiresAt: string | null) => {
        if (!expiresAt) return null;
        const diff = new Date(expiresAt).getTime() - Date.now();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        return days > 0 ? days : 0;
    };

    const isOnline = (lastSeen: string) => {
        if (!lastSeen) return false;
        const diff = Date.now() - new Date(lastSeen).getTime();
        return diff < 1000 * 60 * 5; // 5 minutes for "real-time" feel
    };

    return (
        <MainLayout>
            <div className="p-4 md:p-8 space-y-6 md:space-y-10 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="text-2xl md:text-4xl font-black text-foreground flex items-center gap-3 tracking-tighter">
                            <BarChart3 className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                            Console do Fundador
                        </h1>
                        <p className="text-sm md:text-base text-muted-foreground mt-1">Gerenciamento global do ecossistema SaaS.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="outline"
                            onClick={fetchData}
                            className="w-full sm:w-auto font-bold h-10 px-6 border-primary/20 hover:bg-primary/5"
                        >
                            Atualizar Dados
                        </Button>
                    </div>
                </header>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                    {[
                        { label: 'Usuários', value: metrics?.total_users || 0, icon: Users, color: 'text-primary' },
                        { label: 'Online', value: metrics?.active_now || 0, icon: Activity, color: 'text-primary' },
                        { label: 'Tickets', value: metrics?.open_tickets || 0, icon: AlertCircle, color: 'text-amber-500' },
                        { label: 'Feeds', value: metrics?.total_feeds || 0, icon: Zap, color: 'text-purple-500' },
                    ].map((m, i) => (
                        <Card key={i} className="p-4 md:p-6 glass-card relative overflow-hidden group border-none shadow-lg">
                            <div className={cn("absolute top-0 right-0 p-3 md:p-4 opacity-10 group-hover:opacity-25 transition-all duration-500 group-hover:scale-110", m.color)}>
                                <m.icon className="w-10 h-10 md:w-14 md:h-14" />
                            </div>
                            <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60">{m.label}</p>
                            <h3 className={cn("text-2xl md:text-4xl font-black mt-1 md:mt-2 tracking-tighter", m.color)}>{m.value}</h3>
                        </Card>
                    ))}
                </div>

                {/* User Management Section */}
                <div className="space-y-4 md:space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <h2 className="text-xl md:text-2xl font-black flex items-center gap-3 tracking-tight">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Users className="w-4 h-4 text-primary" />
                            </div>
                            Gestão de Usuários
                        </h2>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-muted/20 text-[10px] py-1 px-3 border-border/40 uppercase font-black tracking-widest">{users.length} TOTAL</Badge>
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] py-1 px-3 uppercase font-black tracking-widest">
                                {users.filter(u => isOnline(u.last_seen_at)).length} ONLINE
                            </Badge>
                        </div>
                    </div>

                    {/* Mobile: Card View */}
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                        {users.map((u) => (
                            <Card key={u.id} className="p-5 glass-card border-none shadow-md space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner",
                                                isOnline(u.last_seen_at) ? "bg-primary/10 text-primary" : "bg-primary/10 text-primary",
                                                u.is_blocked && "grayscale opacity-50"
                                            )}>
                                                {u.full_name?.charAt(0) || u.email?.charAt(0).toUpperCase()}
                                            </div>
                                            {isOnline(u.last_seen_at) && !u.is_blocked && (
                                                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-primary border-2 border-background shadow-sm"></span>
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h4 className="font-bold text-foreground truncate max-w-[140px]">{u.full_name || 'Usuário'}</h4>
                                                {u.auth_provider === 'google' && (
                                                    <Badge className="h-4 text-[8px] bg-blue-500/10 text-blue-600 border-none uppercase font-black px-1.5 ring-1 ring-blue-500/20">Google</Badge>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0"
                                            onClick={() => { setSelectedUser(u); setIsMessageDialogOpen(true); }}
                                        >
                                            <Wrench className="w-4 h-4 text-muted-foreground" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-y-4 gap-x-6 py-4 border-y border-border/10">
                                    <div>
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Status / Plano</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-black uppercase text-foreground">{u.plan_name}</span>
                                            <Badge className={cn(
                                                "text-[9px] py-0 h-4 border-none uppercase font-black",
                                                u.subscription_status === 'active' ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                                            )}>
                                                {u.subscription_status}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Empresa</p>
                                        <p className="text-[11px] font-bold text-foreground truncate">{u.company_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Expiração</p>
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="w-3 h-3 text-muted-foreground" />
                                            <span className={cn(
                                                "text-[11px] font-black",
                                                u.expires_at && calculateDaysLeft(u.expires_at)! <= 5 ? "text-destructive underline decoration-2 underline-offset-2" : "text-foreground"
                                            )}>
                                                {u.expires_at ? `${calculateDaysLeft(u.expires_at)}d restantes` : 'Vitalício'}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Acesso</p>
                                        <p className="text-[11px] font-medium text-foreground italic text-xs">
                                            {u.last_seen_at ? formatDistanceToNow(new Date(u.last_seen_at), { addSuffix: true, locale: ptBR }) : 'Nunca'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-4 pt-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            "flex-1 gap-2 font-black uppercase text-[10px] tracking-widest h-9",
                                            u.is_blocked ? "text-primary border-primary/30 hover:bg-primary/5" : "text-destructive border-destructive/30 hover:bg-destructive/5"
                                        )}
                                        onClick={() => { setSelectedUser(u); setIsBlockDialogOpen(true); }}
                                    >
                                        {u.is_blocked ? (
                                            <><Unlock className="w-3.5 h-3.5" /> Desbloquear</>
                                        ) : (
                                            <><Ban className="w-3.5 h-3.5" /> Bloquear Acesso</>
                                        )}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="gap-2 font-black uppercase text-[10px] tracking-widest h-9 px-4"
                                        onClick={() => { setSelectedUser(u); setIsMessageDialogOpen(true); }}
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-2 font-black uppercase text-[10px] tracking-widest h-9 px-4 text-destructive/40 hover:text-destructive hover:bg-destructive/5"
                                        onClick={() => { setSelectedUser(u); setIsDeleteDialogOpen(true); }}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Desktop: Table View */}
                    <Card className="glass-card hidden md:block border-none shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border/10 bg-muted/20">
                                        <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Usuário</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Empresa</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Status / Plano</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Expiração</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Último Acesso</th>
                                        <th className="p-5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/10">
                                    {users.map((u) => (
                                        <tr key={u.id} className="hover:bg-primary/[0.02] transition-colors group">
                                            <td className="p-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative">
                                                        <div className={cn(
                                                            "w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-inner transition-all duration-300 ring-1 ring-border/20",
                                                            isOnline(u.last_seen_at) ? "bg-primary/10 text-primary" : "bg-primary/10 text-primary",
                                                            u.is_blocked && "grayscale opacity-50"
                                                        )}>
                                                            {u.full_name?.charAt(0) || u.email?.charAt(0).toUpperCase()}
                                                        </div>
                                                        {isOnline(u.last_seen_at) && !u.is_blocked && (
                                                            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/40 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary border-2 border-background shadow-sm"></span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <p className="text-sm font-bold text-foreground leading-tight truncate">
                                                                {u.full_name || 'Usuário'}
                                                            </p>
                                                            {u.auth_provider === 'google' && (
                                                                <Badge className="h-4 text-[8px] bg-blue-500/10 text-blue-600 border-none uppercase font-black px-1.5 ring-1 ring-blue-500/20">Google</Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-muted-foreground truncate font-medium">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                <Badge variant="outline" className="text-[10px] font-bold py-1 px-3 border-border/40 bg-muted/20 uppercase tracking-widest">
                                                    {u.company_name}
                                                </Badge>
                                            </td>
                                            <td className="p-5 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black uppercase tracking-tighter text-foreground decoration-primary/30 decoration-2">
                                                        {u.plan_name}
                                                    </span>
                                                    <Badge className={cn(
                                                        "text-[9px] h-4 px-1.5 uppercase font-black border-none shadow-sm",
                                                        u.subscription_status === 'active' ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                                                    )}>
                                                        {u.subscription_status}
                                                    </Badge>
                                                </div>
                                            </td>
                                            <td className="p-5">
                                                {u.expires_at ? (
                                                    <div className="space-y-0.5">
                                                        <p className={cn(
                                                            "text-[11px] font-black uppercase tracking-tight",
                                                            calculateDaysLeft(u.expires_at)! <= 5 ? "text-destructive" : "text-foreground"
                                                        )}>
                                                            {calculateDaysLeft(u.expires_at)} dias restantes
                                                        </p>
                                                        <p className="text-[9px] text-muted-foreground font-medium">
                                                            Expira em {new Date(u.expires_at).toLocaleDateString('pt-BR')}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-40">Vitalício</span>
                                                )}
                                            </td>
                                            <td className="p-5">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold text-foreground opacity-80 decoration-primary/20 underline underline-offset-4 decoration-2">
                                                        {u.last_seen_at ? formatDistanceToNow(new Date(u.last_seen_at), { addSuffix: true, locale: ptBR }) : 'Nunca'}
                                                    </span>
                                                    {isOnline(u.last_seen_at) && (
                                                        <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-1 flex items-center gap-1.5">
                                                            <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                                            Ativo Agora
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-5 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-2 group-hover:translate-x-0">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-9 w-9 p-0 text-muted-foreground hover:text-primary transition-all hover:bg-primary/5 rounded-xl"
                                                        onClick={() => {
                                                            setSelectedUser(u);
                                                            setIsMessageDialogOpen(true);
                                                        }}
                                                    >
                                                        <Wrench className="w-4.5 h-4.5" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className={cn(
                                                            "h-9 w-9 p-0 transition-all rounded-xl",
                                                            u.is_blocked ? "text-primary hover:bg-primary/5 shadow-inner" : "text-destructive/50 hover:text-destructive hover:bg-destructive/5"
                                                        )}
                                                        onClick={() => {
                                                            setSelectedUser(u);
                                                            setIsBlockDialogOpen(true);
                                                        }}
                                                    >
                                                        {u.is_blocked ? <Unlock className="w-4.5 h-4.5" /> : <Ban className="w-4.5 h-4.5" />}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-9 w-9 p-0 text-destructive/30 hover:text-destructive transition-all hover:bg-destructive/5 rounded-xl"
                                                        onClick={() => {
                                                            setSelectedUser(u);
                                                            setIsDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4.5 h-4.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                    {/* Broadcast / Announcements */}
                    <div className="space-y-4">
                        <h2 className="text-xl md:text-2xl font-black flex items-center gap-2">
                            <Send className="w-6 h-6 text-primary" />
                            Mural de Avisos
                        </h2>
                        <Card className="p-6 glass-card space-y-4 border-none shadow-lg">
                            <p className="text-xs text-muted-foreground">Isso enviará uma notificação para todos os usuários logados na plataforma.</p>
                            <Input
                                placeholder="Título do aviso..."
                                value={announcement.title}
                                className="bg-muted/20 border-border/50 h-11"
                                onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                            />
                            <textarea
                                className="w-full bg-muted/20 border border-border/50 rounded-lg p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[120px] transition-all"
                                placeholder="Conteúdo da mensagem..."
                                value={announcement.message}
                                onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                            />
                            <Button className="w-full h-11 gap-2 font-black uppercase tracking-widest hover:scale-[1.01] active:scale-95 transition-all shadow-lg shadow-primary/20" onClick={sendAnnouncement}>
                                <Send className="w-4 h-4" />
                                Disparar para Todos
                            </Button>
                        </Card>
                    </div>

                    {/* Queue Monitor (NEW Section) */}
                    <div className="space-y-4">
                        <h2 className="text-xl md:text-2xl font-black flex items-center gap-2">
                            <Activity className="w-6 h-6 text-emerald-500" />
                            Monitor da Fila (Engine)
                        </h2>
                        <Card className="p-0 glass-card border-none shadow-lg overflow-hidden">
                            <div className="p-5 border-b border-border/10 grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Pendente</p>
                                    <p className="text-xl font-black text-foreground">{metrics?.queue_pending || 0}</p>
                                </div>
                                <div className="text-center border-x border-border/10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Rodando</p>
                                    <p className="text-xl font-black text-primary animate-pulse">{metrics?.queue_processing || 0}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Falhas</p>
                                    <p className="text-xl font-black text-destructive">{metrics?.queue_failed || 0}</p>
                                </div>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                                <table className="w-full text-left border-collapse">
                                    <tbody className="divide-y divide-border/10">
                                        {queueTasks.length > 0 ? queueTasks.map((task) => (
                                            <tr key={task.id} className="text-[11px] hover:bg-white/5">
                                                <td className="p-3">
                                                    <p className="font-bold text-foreground">
                                                        {task.payload?.task === 'sync_and_process' ? 'Sync Feed' : 'Rewrite Content'}
                                                    </p>
                                                    <p className="text-[9px] text-muted-foreground truncate max-w-[150px]">
                                                        {task.organizations?.app_name || 'Org Desconhecida'}
                                                    </p>
                                                </td>
                                                <td className="p-3">
                                                    <Badge className={cn(
                                                        "text-[9px] uppercase font-black px-1.5 py-0 h-4 border-none",
                                                        task.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" :
                                                            task.status === 'processing' ? "bg-primary/10 text-primary animate-pulse" :
                                                                task.status === 'failed' ? "bg-destructive/10 text-destructive" :
                                                                    "bg-muted/20 text-muted-foreground"
                                                    )}>
                                                        {task.status}
                                                    </Badge>
                                                </td>
                                                <td className="p-3 text-right text-muted-foreground font-mono">
                                                    {formatDistanceToNow(new Date(task.created_at), { addSuffix: false, locale: ptBR })}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={3} className="p-10 text-center text-muted-foreground italic text-xs">
                                                    Nenhuma tarefa na fila.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-3 bg-muted/20 border-t border-border/10 flex justify-center">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-[10px] font-black uppercase tracking-widest gap-2 h-7"
                                    onClick={() => handleForceWorker()}
                                >
                                    <RefreshCw className="w-3 h-3" /> Forçar Worker
                                </Button>
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl md:text-2xl font-black flex items-center gap-2">
                            <ShieldAlert className="w-6 h-6 text-amber-500" />
                            Manutenção
                        </h2>
                        <Card className="p-6 glass-card space-y-4 border-none shadow-lg mt-0.5">
                            <p className="text-xs text-muted-foreground">Controles críticos para estado de emergência ou atualizações estruturais.</p>
                            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/10">
                                <div>
                                    <p className="text-sm font-bold text-foreground">Modo de Manutenção</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Bloqueia acesso externo</p>
                                </div>
                                <Badge variant="secondary" className="opacity-50 text-[9px] font-black">EM DESENVOLVIMENTO</Badge>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/10">
                                <div>
                                    <p className="text-sm font-bold text-foreground">Reparar Banco de Dados</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Aplica patches e novas rotinas</p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleRepairDatabase}
                                    disabled={isRepairing}
                                    className="text-[10px] h-8 font-black border-primary/40 text-primary uppercase tracking-widest gap-2 bg-primary/5 hover:bg-primary/10"
                                >
                                    {isRepairing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                    Executar
                                </Button>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/10">
                                <div>
                                    <p className="text-sm font-bold text-foreground">Limpeza de Logs</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Otimização de banco</p>
                                </div>
                                <Button size="sm" variant="outline" className="text-[10px] h-8 font-black border-border/40 uppercase tracking-widest">Executar</Button>
                            </div>
                        </Card>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 pb-10">
                    <div className="space-y-4">
                        <h2 className="text-xl md:text-2xl font-black flex items-center gap-2">
                            <Database className="w-6 h-6 text-blue-500" />
                            Segurança & Backup
                        </h2>
                        <Card className="p-6 glass-card space-y-4 border-none shadow-lg">
                            <p className="text-xs text-muted-foreground">Exporte os dados brutos das tabelas principais para arquivamento local.</p>
                            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                                {[
                                    { name: 'Usuários', table: 'user_profiles' },
                                    { name: 'Feeds', table: 'feeds' },
                                    { name: 'Financeiro', table: 'subscriptions' },
                                    { name: 'Configurações', table: 'white_label_settings' }
                                ].map((item) => (
                                    <Button
                                        key={item.table}
                                        variant="outline"
                                        className="h-14 gap-4 text-[11px] font-black uppercase tracking-widest justify-start px-5 border-border/40 hover:bg-muted/50 transition-all rounded-xl"
                                        onClick={() => exportData(item.table)}
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                                            <Download className="w-4 h-4 text-primary" />
                                        </div>
                                        {item.name}
                                    </Button>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-xl md:text-2xl font-black flex items-center gap-2">
                            <Ticket className="w-6 h-6 text-primary" />
                            Central de Chamados
                        </h2>
                        <Card className="p-6 glass-card flex flex-col items-center justify-center min-h-[180px] text-center border-none shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -translate-y-1/2 translate-x-1/2" />
                            <div className="relative z-10 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                                    <Ticket className="w-8 h-8 text-primary animate-bounce-slow" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-base font-black text-foreground tracking-tight">Sistema de Suporte Ativo</p>
                                    <p className="text-xs text-muted-foreground font-medium">Monitoramento de SLAs em tempo real.</p>
                                </div>
                                <Badge variant="outline" className="text-[10px] font-black tracking-widest uppercase py-1 px-4 border-primary/20 bg-primary/5 text-primary">
                                    {tickets.length} CHAMADOS EM ABERTO
                                </Badge>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Technical Support Dialog */}
            <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
                <DialogContent className="sm:max-w-md bg-background border-border/40 rounded-[24px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
                            <Wrench className="w-6 h-6 text-primary" />
                            Assistência Técnica: {selectedUser?.full_name || selectedUser?.email}
                        </DialogTitle>
                        <DialogDescription className="text-xs font-medium">
                            Envie orientações ou suporte técnico diretamente para o dashboard deste usuário.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Assunto do Suporte</Label>
                            <Input
                                placeholder="Ex: Ajuste de Configurações"
                                value={directMessage.title}
                                className="h-11 bg-muted/20 border-border/40"
                                onChange={(e) => setDirectMessage({ ...directMessage, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Instruções / Solução</Label>
                            <Textarea
                                placeholder="Descreva os passos ou informações técnicas..."
                                className="min-h-[140px] bg-muted/20 border-border/40 p-4 text-sm"
                                value={directMessage.message}
                                onChange={(e) => setDirectMessage({ ...directMessage, message: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setIsMessageDialogOpen(false)} className="font-bold">Cancelar</Button>
                        <Button className="gap-2 font-black uppercase tracking-widest shadow-lg shadow-primary/20" onClick={sendTargetedMessage}>
                            <Send className="w-4 h-4" />
                            Enviar Suporte
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Block User Dialog */}
            <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
                <DialogContent className="sm:max-w-md bg-background border-border/40 rounded-[24px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-xl font-black tracking-tight">
                            {selectedUser?.is_blocked ? (
                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center"><Unlock className="w-6 h-6 text-emerald-500" /></div>
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center"><Ban className="w-6 h-6 text-destructive" /></div>
                            )}
                            {selectedUser?.is_blocked ? 'Desbloquear Usuário' : 'Bloquear Usuário'}
                        </DialogTitle>
                        <DialogDescription className="text-xs font-medium mt-1">
                            {selectedUser?.is_blocked
                                ? 'Isso restaurará o acesso imediato do usuário a todas as funcionalidades da plataforma.'
                                : 'Esta ação impedirá que o usuário realize login ou acesse seus dados até que seja desbloqueado.'}
                        </DialogDescription>
                    </DialogHeader>
                    {!selectedUser?.is_blocked && (
                        <div className="space-y-2 py-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Motivo do Bloqueio (Opcional)</Label>
                            <Textarea
                                placeholder="Ex: Violação dos termos de uso, falta de pagamento..."
                                className="min-h-[100px] bg-muted/20 border-border/40"
                                value={blockReason}
                                onChange={(e) => setBlockReason(e.target.value)}
                            />
                        </div>
                    )}
                    <DialogFooter className="gap-2 sm:gap-0 pt-2">
                        <Button variant="ghost" onClick={() => setIsBlockDialogOpen(false)} className="font-bold">Cancelar</Button>
                        <Button
                            variant={selectedUser?.is_blocked ? "default" : "destructive"}
                            onClick={toggleUserBlock}
                            className={cn(
                                "font-black uppercase tracking-widest",
                                selectedUser?.is_blocked ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20" : "shadow-lg shadow-destructive/20"
                            )}
                        >
                            {selectedUser?.is_blocked ? 'Confirmar Desbloqueio' : 'Confirmar Bloqueio'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Account Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md bg-background border-border/40 rounded-[24px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-xl font-black tracking-tight">
                            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                                <Trash2 className="w-6 h-6 text-destructive" />
                            </div>
                            Excluir Conta Permanentemente
                        </DialogTitle>
                        <DialogDescription className="text-xs font-medium mt-1">
                            Você está prestes a excluir a conta de <strong>{selectedUser?.full_name || selectedUser?.email}</strong>.
                            Esta ação é <span className="text-destructive font-bold uppercase">irreversível</span> e removerá todos os dados,
                            feeds e configurações associadas a este usuário.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="bg-destructive/5 p-4 rounded-xl border border-destructive/10 my-2">
                        <p className="text-[10px] text-destructive font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                            <AlertCircle className="w-3 h-3" /> Atenção
                        </p>
                        <p className="text-[11px] text-destructive/80 font-medium leading-relaxed">
                            O usuário será desconectado e perderá o acesso imediatamente. Todos os recursos físicos (arquivos e conexões) vinculados a esta conta serão removidos do sistema.
                        </p>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 pt-2">
                        <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} className="font-bold text-xs uppercase tracking-widest">Manter Conta</Button>
                        <Button
                            variant="destructive"
                            onClick={deleteUser}
                            className="font-black uppercase tracking-widest shadow-lg shadow-destructive/20 px-6"
                        >
                            Sim, Excluir Agora
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </MainLayout>
    );
}

