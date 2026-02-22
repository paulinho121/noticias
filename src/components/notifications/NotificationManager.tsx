import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, ShieldAlert, LogOut, Wrench } from 'lucide-react';

export function NotificationManager() {
    const [targetedNotification, setTargetedNotification] = useState<any>(null);
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockReason, setBlockReason] = useState('');

    useEffect(() => {
        // 1. Initial Checks
        checkStatus();

        // 2. Realtime Subscriptions
        const notificationsSub = supabase
            .channel('targeted-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'user_notifications',
                },
                (payload) => {
                    handleNewNotification(payload.new);
                }
            )
            .subscribe();

        const profileSub = supabase
            .channel('profile-updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'user_profiles',
                },
                (payload: any) => {
                    if (payload.new.is_blocked) {
                        setIsBlocked(true);
                        setBlockReason(payload.new.block_reason || '');
                    } else if (payload.old?.is_blocked && !payload.new.is_blocked) {
                        setIsBlocked(false);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(notificationsSub);
            supabase.removeChannel(profileSub);
        };
    }, []);

    const checkStatus = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await (supabase as any)
            .from('user_profiles')
            .select('is_blocked, block_reason')
            .eq('id', user.id)
            .maybeSingle();

        if (profile?.is_blocked) {
            setIsBlocked(true);
            setBlockReason(profile.block_reason || '');
        }
    };

    const handleNewNotification = async (notification: any) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (notification.user_id !== user?.id) return;

        setTargetedNotification(notification);
        toast.info(notification.title, {
            description: notification.message,
            duration: 10000,
        });
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    return (
        <>
            {/* Targeted Notification Modal */}
            <Dialog
                open={!!targetedNotification}
                onOpenChange={(open) => !open && setTargetedNotification(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {targetedNotification?.type === 'technical_support' ? (
                                <Wrench className="w-5 h-5 text-primary" />
                            ) : (
                                <Bell className="w-5 h-5 text-primary" />
                            )}
                            {targetedNotification?.title}
                        </DialogTitle>
                        <DialogDescription className="text-foreground pt-2">
                            {targetedNotification?.message}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setTargetedNotification(null)}>Entendido</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Blocking Overlay */}
            <Dialog open={isBlocked} onOpenChange={() => { }}>
                <DialogContent className="sm:max-w-md border-destructive/50 bg-destructive/5 backdrop-blur-xl [&>button]:hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <ShieldAlert className="w-6 h-6" />
                            Acesso Bloqueado
                        </DialogTitle>
                        <DialogDescription className="text-foreground font-medium pt-4">
                            Sua conta foi temporariamente ou permanentemente suspensa por um administrador.
                        </DialogDescription>
                    </DialogHeader>
                    {blockReason && (
                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm italic">
                            Motivo: {blockReason}
                        </div>
                    )}
                    <DialogFooter className="sm:justify-center">
                        <Button variant="destructive" className="w-full gap-2" onClick={handleLogout}>
                            <LogOut className="w-4 h-4" />
                            Sair do Sistema
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
