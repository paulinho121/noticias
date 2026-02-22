import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bell, Send, Loader2, Wrench } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminNotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AdminNotificationModal({ isOpen, onClose }: AdminNotificationModalProps) {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSend = async () => {
        if (!title || !message) {
            toast.error("Por favor, preencha o título e a mensagem.");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('admin_notifications')
                .insert([
                    { title, message, type: 'info' }
                ]);

            if (error) throw error;

            toast.success("Notificação enviada com sucesso!");
            setTitle('');
            setMessage('');
            onClose();
        } catch (error: any) {
            console.error('Error sending notification:', error);
            toast.error("Erro ao enviar notificação: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
                        <Wrench className="w-5 h-5 text-primary" />
                        Assistência Técnica Global
                    </DialogTitle>
                    <DialogDescription className="text-xs font-medium">
                        Esta mensagem será exibida como um aviso técnico para todos os usuários da plataforma.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Assunto do Suporte</Label>
                        <Input
                            id="title"
                            placeholder="Ex: Manutenção agendada ou Atualização de Banco"
                            value={title}
                            className="h-11 bg-muted/20 border-border/40"
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="message" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Detalhes Técnicos / Instruções</Label>
                        <Textarea
                            id="message"
                            placeholder="Descreva as instruções ou o estado do sistema..."
                            className="min-h-[140px] bg-muted/20 border-border/40 p-4 text-sm"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            rows={4}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={onClose} disabled={loading} className="font-bold">
                        Cancelar
                    </Button>
                    <Button onClick={handleSend} disabled={loading} className="gap-2 font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                        Disparar Suporte Global
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
