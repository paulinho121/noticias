import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FeedItem } from '@/lib/api';
import { sanitizeHTML } from '@/lib/sanitizer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Eye,
    CheckCircle,
    XCircle,
    ChevronRight,
    ArrowLeftRight,
    ExternalLink,
    Calendar,
    MessageCircle,
    Send,
    Twitter,
    Facebook,
    Instagram,
    Share2,
    Copy,
    Check,
    Edit as EditIcon,
    Monitor,
    Save,
    RotateCcw,
    Sparkles,
    Zap,
    Rss,
    Loader2,
    Wand2,
    Video,
    ChevronDown,
    Globe,
    Image as ImageIcon
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { cn, safeParseAiContent, sanitizeHtml, getHighResImage } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

interface RewrittenItemCardProps {
    item: FeedItem;
    onApprove?: (id: string, updatedData?: Partial<FeedItem>, platformId?: string) => void;
    onReject?: (id: string) => void;
    onEdit?: (item: FeedItem) => void;
    onRewrite?: (data: { itemId: string; title: string; content: string; tone?: string; onlyImage?: boolean; custom_prompt?: string }) => Promise<any>;
}

export function RewrittenItemCard({ item, onApprove, onReject, onEdit, onRewrite }: RewrittenItemCardProps) {
    const queryClient = useQueryClient();
    const [showComparison, setShowComparison] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isAutoGenerating, setIsAutoGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentStepMsg, setCurrentStepMsg] = useState('');

    const { connectedPlatforms } = usePlatformSettings();
    const [showSocialShare, setShowSocialShare] = useState(false);
    const connectedSocials = connectedPlatforms.filter(p => p.platform_id !== 'wordpress');

    // Quick Edit Mode States
    const [isQuickEditing, setIsQuickEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState(item.rewritten_title || item.source_title || '');
    const [editedContent, setEditedContent] = useState(item.rewritten_content || item.source_content || '');
    const [rewrittenImage, setRewrittenImage] = useState(item.rewritten_image);

    // Image Fallback Logic
    const isBrokenUrl = (url: string | null | undefined) =>
        !url ||
        url.includes('oaidalleapiprodscus.blob.core.windows.net') ||
        url === 'placeholder.jpeg'; // General string cleanup

    const [thumbnailSrc, setThumbnailSrc] = useState(() => {
        const r = item.rewritten_image;
        const s = item.source_image;
        const safeR = isBrokenUrl(r) ? null : r;
        const safeS = isBrokenUrl(s) ? null : s;
        return getHighResImage(safeR) || getHighResImage(safeS) || '';
    });
    const [thumbnailFailed, setThumbnailFailed] = useState(false);
    const [sourceImageFailed, setSourceImageFailed] = useState(false);
    const [optimizedImageFailed, setOptimizedImageFailed] = useState(false);

    useEffect(() => {
        const rewritten = item.rewritten_image;
        const source = item.source_image;

        const safeRewritten = isBrokenUrl(rewritten) ? null : (rewritten ? getHighResImage(rewritten) : null);
        const safeSource = isBrokenUrl(source) ? null : (source ? getHighResImage(source) : null);

        setThumbnailSrc(safeRewritten || safeSource || '');
        setThumbnailFailed(false);
        setSourceImageFailed(false);
        setOptimizedImageFailed(false);

        if (showPreview) {
            setEditedTitle(item.rewritten_title || item.source_title || '');
            setEditedContent(item.rewritten_content || item.source_content || '');
            setRewrittenImage(item.rewritten_image);
            setIsQuickEditing(false);
        }
    }, [item.rewritten_image, item.source_image, showPreview, item.rewritten_title, item.source_title, item.rewritten_content, item.source_content]);

    // Auto-generate image when preview opens and item has no AI-generated image
    useEffect(() => {
        // Considera "sem imagem IA" quando: não há rewritten_image, ou é idêntica à source (fallback silencioso)
        const hasAiImage = !!item.rewritten_image && item.rewritten_image !== item.source_image;

        if (
            showPreview &&
            !isAutoGenerating &&
            !isProcessing &&
            item.status !== 'processing' &&
            item.source_image &&
            !isBrokenUrl(item.source_image) &&
            !hasAiImage &&
            onRewrite
        ) {
            setIsAutoGenerating(true);
            onRewrite({
                itemId: item.id,
                title: item.rewritten_title || item.source_title || '',
                content: item.rewritten_content || item.source_content || '',
                onlyImage: true,
                tone: 'journalistic',
            }).then((result) => {
                // Backend agora retorna rewritten_image diretamente no corpo
                const newImg = result?.rewritten_image;
                if (result?.success && newImg) {
                    setRewrittenImage(newImg);
                    setThumbnailSrc(newImg);
                }
            }).catch(() => { }).finally(() => setIsAutoGenerating(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showPreview]);

    // Progress Polling Effect
    useEffect(() => {
        if (item.status !== 'processing') {
            setProgress(item.status === 'success' || item.status === 'ready' || item.status === 'published' ? 100 : 0);
            setCurrentStepMsg('');
            return;
        }

        const fetchProgress = async () => {
            const { data } = await supabase
                .from('logs')
                .select('step, message')
                .eq('feed_item_id', item.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (data) {
                setCurrentStepMsg(data.message);
                // Heurística de progresso baseada no passo
                if (data.step === 'init') setProgress(15);
                else if (data.message.includes('OpenAI') || data.message.includes('Gemini')) setProgress(55);
                else if (data.message.includes('imagem')) setProgress(85);
                else if (data.step === 'complete') setProgress(100);
            } else {
                setProgress(5);
                setCurrentStepMsg('Iniciando...');
            }
        };

        fetchProgress();
        const interval = setInterval(fetchProgress, 3000);
        return () => clearInterval(interval);
    }, [item.id, item.status]);

    const handleQuickApprove = (platformId?: string) => {
        if (isQuickEditing) {
            onApprove?.(item.id, { rewritten_title: editedTitle, rewritten_content: editedContent }, platformId);
        } else {
            onApprove?.(item.id, undefined, platformId);
        }
        setShowPreview(false);
    };

    const handleCancelProcessing = async () => {
        setIsProcessing(true);
        try {
            // Fetch the active log and cancel it
            const { data: logs } = await supabase
                .from('logs')
                .select('id')
                .eq('feed_item_id', item.id)
                .eq('status', 'processing')
                .limit(1);

            if (logs && logs.length > 0) {
                await (supabase as any).from('logs').delete().eq('id', logs[0].id);
            }

            // Move item back to pending
            await supabase
                .from('feed_items')
                .update({ status: 'pending', error_message: 'Cancelado pelo usuário' })
                .eq('id', item.id);

            queryClient.invalidateQueries({ queryKey: ['feed-items'] });
            setProgress(0);
            setCurrentStepMsg('');

            toast.success("Processamento cancelado.");
        } catch (error) {
            console.error("Erro ao cancelar:", error);
            toast.error("Falha ao cancelar.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTriggerRewrite = async (onlyImage: boolean = false) => {
        if (!onRewrite) return;
        setIsProcessing(true);
        try {
            const result = await onRewrite({
                itemId: item.id,
                title: editedTitle,
                content: editedContent,
                onlyImage,
                tone: 'journalistic',
                custom_prompt: item.feeds?.custom_prompt
            });

            if (result.success) {
                if (result.rewritten) {
                    setEditedTitle(result.rewritten.title || editedTitle);
                    setEditedContent(result.rewritten.content || editedContent);
                    if (result.rewritten.rewritten_image) {
                        setRewrittenImage(result.rewritten.rewritten_image);
                        toast.success("IA otimizou a imagem com sucesso!");
                    } else {
                        toast.info("Conteúdo reescrito! A imagem será gerada em breve.");
                    }
                } else {
                    toast.success("Otimização iniciada!", {
                        description: "A IA está trabalhando em segundo plano. O card será atualizado assim que terminar."
                    });
                    setShowPreview(false); // Fecha o preview para o usuário ver a lista
                }
            } else {
                toast.error("Ocorreu um problema ao iniciar o processamento.");
            }
        } catch (error) {
            console.error("Erro ao iniciar IA:", error);
            toast.error("Falha ao iniciar processamento.");
        } finally {
            setIsProcessing(false);
        }
    };

    const statusColors = {
        pending: 'text-orange-500 bg-orange-500/10',
        processing: 'text-primary bg-primary/10',
        success: 'text-primary bg-primary/10',
        ready: 'text-primary bg-primary/10',
        error: 'text-destructive bg-destructive/10',
        published: 'text-purple-500 bg-purple-500/10',
    };

    const statusLabels: Record<string, string> = {
        pending: 'AGUARDANDO',
        processing: 'PROCESSANDO',
        success: 'A PUBLICAR',
        ready: 'PRONTO',
        error: 'ERRO',
        published: 'PUBLICADO',
    };

    const display = safeParseAiContent(item.rewritten_title || item.source_title, item.rewritten_content || item.source_content);

    return (
        <>
            <div className="relative z-0 bg-card border border-border/80 rounded-xl overflow-hidden group transition-all hover:border-border hover:shadow-lg hover:shadow-black/5">
                {/* Progress Bar for Processing */}
                {item.status === 'processing' && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-primary/10 z-50">
                        <div
                            className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
                {/* Header */}
                <div className="relative z-10 px-4 md:px-6 py-3 md:py-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between bg-muted/10 gap-3">
                    <div className="flex items-center gap-3 md:gap-4 overflow-x-auto no-scrollbar">
                        <Badge variant="outline" className={cn("px-2.5 py-0.5 rounded-full text-[9px] md:text-[10px] uppercase font-bold tracking-wider border-none shrink-0", statusColors[item.status as keyof typeof statusColors])}>
                            <span className={cn("w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80", item.status === 'processing' && "animate-pulse")} />
                            {item.status === 'processing' && progress > 0 ? `${progress}% PROCESSANDO` : (statusLabels[item.status] || item.status)}
                        </Badge>

                        {item.feeds?.name && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/40 border border-border/40 text-[10px] md:text-xs font-bold text-muted-foreground/80 shrink-0">
                                <Rss className="w-3 md:w-3.5 h-3 md:h-3.5 text-primary/60" />
                                <span className="truncate max-w-[120px] sm:max-w-[200px]">{item.feeds.name}</span>
                            </div>
                        )}

                        <div className="flex items-center gap-2 md:gap-3 text-muted-foreground/60 shrink-0">
                            <span className="flex items-center gap-1.5 text-[10px] md:text-xs font-medium">
                                <Calendar className="w-3 md:w-3.5 h-3 md:h-3.5" />
                                {format(new Date(item.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 md:h-8 px-2 rounded-lg gap-1.5 text-[10px] md:text-xs font-semibold text-muted-foreground hover:text-foreground"
                            onClick={() => setShowComparison(!showComparison)}
                        >
                            <ArrowLeftRight className="w-3 md:w-3.5 h-3 md:h-3.5" />
                            <span className="hidden xs:inline">{showComparison ? 'Original' : 'Comparar'}</span>
                            <span className="xs:hidden">{showComparison ? 'Orig.' : 'Comp.'}</span>
                        </Button>
                        <div className="w-px h-3 md:h-4 bg-border/60 mx-1" />
                        <a
                            href={item.source_url.trim().startsWith('http') ? item.source_url.trim() : `https://${item.source_url.trim()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 md:p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground/60 hover:text-foreground relative z-20 cursor-pointer"
                            title="Ver Original"
                        >
                            <ExternalLink className="w-3.5 md:w-4 h-3.5 md:h-4" />
                        </a>
                    </div>
                </div>

                {/* Content Area */}
                <div className="relative z-10 p-4 md:p-6">
                    {!showComparison ? (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                                    {thumbnailSrc && !thumbnailFailed ? (
                                        <div className="w-full md:w-48 h-32 md:h-28 rounded-xl overflow-hidden border border-border/40 shrink-0 bg-muted/20 relative group/img">
                                            <img
                                                src={thumbnailSrc || ''}
                                                alt="Thumbnail"
                                                className="w-full h-full object-cover"
                                                onError={() => {
                                                    setThumbnailFailed(true);
                                                }}
                                            />
                                            {/* ... overlays ... */}
                                        </div>
                                    ) : (
                                        <div className="w-full md:w-48 h-32 md:h-28 rounded-xl overflow-hidden border border-border/40 shrink-0 bg-muted/20 flex flex-col items-center justify-center gap-2 text-muted-foreground/50">
                                            <div className="bg-background/50 p-2 rounded-full">
                                                <ImageIcon className="w-5 h-5" />
                                            </div>
                                            <span className="text-[10px] uppercase font-bold tracking-wider">Sem Imagem</span>
                                        </div>
                                    )}
                                    {item.source_video && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
                                                <Video className="w-5 h-5 text-white" />
                                            </div>
                                        </div>
                                    )}
                                    {item.source_video && (
                                        <Badge className="absolute top-2 right-2 bg-primary text-white text-[8px] px-1.5 h-4 border-none font-bold uppercase">Video</Badge>
                                    )}
                                    <div className="space-y-2 flex-1">
                                        <h3 className="font-bold text-lg md:text-xl leading-tight text-foreground tracking-tight">
                                            {display.title}
                                        </h3>
                                        {item.status === 'processing' ? (
                                            <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10 animate-pulse flex flex-col gap-2 shadow-[0_0_15px_rgba(var(--primary),0.1)]">
                                                <div className="flex items-center gap-2">
                                                    <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Atividade da IA</span>
                                                </div>
                                                <p className="text-sm font-medium text-primary/80 italic leading-snug">
                                                    {currentStepMsg || 'Iniciando os motores de inteligência...'}
                                                </p>
                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="text-[9px] text-muted-foreground/60 font-bold uppercase tracking-wider">
                                                        Pode demorar até 1 minuto.
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 px-2 text-[10px] font-bold text-destructive hover:bg-destructive/10 rounded-md"
                                                        onClick={(e) => { e.stopPropagation(); handleCancelProcessing(); }}
                                                        disabled={isProcessing}
                                                    >
                                                        Cancelar IA
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                className="text-sm text-muted-foreground leading-relaxed line-clamp-3 [&_p]:mb-4 last:[&_p]:mb-0"
                                                dangerouslySetInnerHTML={{ __html: sanitizeHTML(display.content || 'Sem conteúdo disponível.') }}
                                            />
                                        )}
                                    </div>
                                </div>
                                {item.published_url && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full sm:w-auto self-start h-8 md:h-9 rounded-lg gap-2 border-border/60 hover:bg-muted font-bold text-[10px] md:text-xs cursor-pointer relative z-20"
                                        asChild
                                    >
                                        <a
                                            href={item.published_url.trim().startsWith('http') ? item.published_url.trim() : `https://${item.published_url.trim()}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Eye className="w-3.5 md:w-4 h-3.5 md:h-4" />
                                            Ver Publicado
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 relative items-start">
                            {/* Original */}
                            <div className="space-y-2 p-3 md:p-4 rounded-xl bg-muted/30 border border-border/40">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60">
                                        Fonte Original
                                    </div>
                                </div>
                                <h4 className="font-semibold text-xs md:text-sm text-muted-foreground line-clamp-2">
                                    {item.source_title}
                                </h4>
                                <div className="text-[11px] md:text-xs text-muted-foreground/70 line-clamp-4 leading-relaxed">
                                    {item.source_content || 'Sem conteúdo original.'}
                                </div>
                            </div>

                            <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 items-center justify-center rounded-full bg-background border border-border shadow-sm z-10">
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            </div>

                            {/* Rewritten */}
                            <div className="space-y-2 p-3 md:p-4 rounded-xl bg-primary/[0.02] border border-primary/10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-primary">
                                        IA Optimized
                                    </div>
                                </div>
                                {(() => {
                                    const rewrittenDisplay = safeParseAiContent(item.rewritten_title, item.rewritten_content);
                                    return (
                                        <>
                                            <h4 className="font-bold text-xs md:text-sm text-foreground line-clamp-2">
                                                {rewrittenDisplay.title || 'Processando...'}
                                            </h4>
                                            <div
                                                className="text-[11px] md:text-xs text-foreground/80 line-clamp-4 leading-relaxed [&_p]:mb-3 last:[&_p]:mb-0"
                                                dangerouslySetInnerHTML={{ __html: sanitizeHTML(rewrittenDisplay.content || 'A IA ainda não processou este item.') }}
                                            />
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Footer */}
                {(item.status === 'pending' || item.status === 'success' || item.status === 'ready') && (
                    <div className="relative z-10 px-4 md:px-6 py-3 md:py-4 bg-muted/10 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 md:py-1.5 rounded-full bg-primary/5 border border-primary/10">
                            {(item.status as string) === 'ready' ? (
                                <>
                                    <CheckCircle className="w-3 md:w-3.5 h-3 md:h-3.5 text-primary" />
                                    <span className="text-[9px] md:text-[11px] font-bold text-primary uppercase tracking-wider">Revisão Final</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3 md:w-3.5 h-3 md:h-3.5 text-primary" />
                                    <span className="text-[9px] md:text-[11px] font-bold text-primary uppercase tracking-wider">Aguardando Revisão</span>
                                </>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 w-full md:w-auto">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 md:h-9 px-3 rounded-lg text-[10px] md:text-xs font-bold text-destructive hover:bg-destructive/5"
                                onClick={(e) => { e.stopPropagation(); onReject?.(item.id); }}
                            >
                                Rejeitar
                            </Button>

                            <div className="w-px h-4 bg-border/60 mx-1 hidden sm:block" />

                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 md:h-9 px-3 rounded-lg text-[10px] md:text-xs font-bold border-border/60 hover:bg-muted"
                                    onClick={(e) => { e.stopPropagation(); setShowPreview(true); }}
                                >
                                    Preview
                                </Button>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 md:h-9 px-3 rounded-lg text-[10px] md:text-xs font-bold border-border/60 hover:bg-muted"
                                    onClick={(e) => { e.stopPropagation(); onEdit?.(item); }}
                                >
                                    Editar
                                </Button>

                                {connectedPlatforms.length > 1 ? (
                                    <div className="flex">
                                        <Button
                                            size="sm"
                                            className={cn(
                                                "h-8 md:h-9 px-4 rounded-l-lg rounded-r-none font-bold text-[10px] md:text-xs uppercase tracking-wider shadow-sm",
                                                "bg-primary text-primary-foreground hover:opacity-90"
                                            )}
                                            onClick={(e) => { e.stopPropagation(); handleQuickApprove(); }}
                                        >
                                            {item.status === 'ready' ? 'Publicar Agora' : 'Aprovar'}
                                        </Button>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    size="sm"
                                                    className={cn(
                                                        "h-8 md:h-9 px-2 rounded-r-lg rounded-l-none border-l border-white/20",
                                                        "bg-primary text-primary-foreground hover:opacity-90"
                                                    )}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <ChevronDown className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56 bg-zinc-950 border-white/10 text-white">
                                                <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Escolher Destino</div>
                                                <DropdownMenuSeparator className="bg-white/5" />
                                                {connectedPlatforms.map(platform => (
                                                    <DropdownMenuItem
                                                        key={platform.platform_id}
                                                        onClick={(e) => { e.stopPropagation(); handleQuickApprove(platform.platform_id); }}
                                                        className="gap-2 cursor-pointer focus:bg-primary/20 focus:text-white py-2.5"
                                                    >
                                                        {platform.platform_id === 'wordpress' && <Globe className="w-4 h-4 text-blue-400" />}
                                                        {platform.platform_id === 'blogger' && <span className="text-sm">🅱️</span>}
                                                        {platform.platform_id === 'custom_api' && <span className="text-sm">🌐</span>}
                                                        <span className="font-bold capitalize">{platform.platform_id}</span>
                                                    </DropdownMenuItem>
                                                ))}
                                                <DropdownMenuSeparator className="bg-white/5" />
                                                <DropdownMenuItem
                                                    onClick={(e) => { e.stopPropagation(); handleQuickApprove('local'); }}
                                                    className="gap-2 cursor-pointer focus:bg-white/10"
                                                >
                                                    <Monitor className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-xs">Apenas Local (Sem postar)</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                ) : (
                                    <Button
                                        size="sm"
                                        className={cn(
                                            "h-8 md:h-9 px-4 md:px-6 rounded-lg font-bold text-[10px] md:text-xs uppercase tracking-wider shadow-sm",
                                            item.status === 'ready' ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-primary text-primary-foreground hover:opacity-90"
                                        )}
                                        onClick={(e) => { e.stopPropagation(); handleQuickApprove(); }}
                                    >
                                        {item.status === 'ready' ? 'Publicar Agora' : 'Aprovar'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Social Share Footer (If published) */}
                {item.status === 'published' && (
                    <div className="px-6 py-4 bg-primary/[0.02] border-t border-border/50 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex flex-col gap-1">
                                <div className="text-sm font-bold text-primary flex items-center gap-1.5">
                                    <CheckCircle className="w-4 h-4" />
                                    Post Publicado!
                                </div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                                    {item.published_url
                                        ? `Integrado: ${new URL(item.published_url).hostname}`
                                        : "Post não integrado externamente"}
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {connectedSocials.length > 0 && (
                                    <Button
                                        size="sm"
                                        className="h-10 px-5 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 gap-2 rounded-xl group/post"
                                        onClick={() => setShowSocialShare(true)}
                                    >
                                        <Send className="w-4 h-4 group-hover/post:translate-x-0.5 group-hover/post:-translate-y-0.5 transition-transform" />
                                        <span>Postar nas Redes</span>
                                    </Button>
                                )}

                                <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-10 px-3 transition-all gap-2 rounded-xl border-border/60 hover:bg-muted"
                                    onClick={() => {
                                        const url = item.published_url || item.source_url;
                                        const text = `*${item.rewritten_title || item.source_title}*\n\n${url}`;
                                        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                                    }}
                                >
                                    <MessageCircle className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-semibold">WhatsApp</span>
                                </Button>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-10 w-10 p-0 border-border/60 hover:bg-muted rounded-xl"
                                    title="Compartilhar no X"
                                    onClick={() => {
                                        const url = item.published_url || item.source_url;
                                        const text = item.rewritten_title || '';
                                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
                                    }}
                                >
                                    <Twitter className="w-4 h-4" />
                                </Button>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-10 w-10 p-0 border-border/60 hover:bg-muted rounded-xl"
                                    title="Facebook"
                                    onClick={() => {
                                        const url = item.published_url || item.source_url;
                                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                                    }}
                                >
                                    <Facebook className="w-4 h-4 text-primary" />
                                </Button>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-10 px-3 border-border/60 hover:bg-muted transition-all gap-2 rounded-xl"
                                    onClick={() => {
                                        const url = item.published_url || item.source_url;
                                        const tempInput = document.createElement('input');
                                        tempInput.value = url || '';
                                        document.body.appendChild(tempInput);
                                        tempInput.select();
                                        document.execCommand('copy');
                                        document.body.removeChild(tempInput);
                                        toast.success('Link copiado!');
                                    }}
                                >
                                    <Copy className="w-4 h-4" />
                                    <span className="text-xs font-semibold">Link</span>
                                </Button>
                            </div>
                        </div>

                        {connectedSocials.length > 0 && (
                            <div className="flex items-center gap-3 pt-3 border-t border-border/40">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">Canais Disponíveis</span>
                                <div className="flex gap-2">
                                    {connectedSocials.map(s => (
                                        <div key={s.platform_id} className="w-7 h-7 rounded-sm bg-primary/5 border border-primary/10 flex items-center justify-center" title={s.platform_id}>
                                            {s.platform_id === 'twitter' && <Twitter className="w-3.5 h-3.5 text-primary" />}
                                            {s.platform_id === 'linkedin' && <Zap className="w-3.5 h-3.5 text-primary" />}
                                            {s.platform_id === 'facebook' && <Facebook className="w-3.5 h-3.5 text-primary" />}
                                            {s.platform_id === 'instagram' && <Instagram className="w-3.5 h-3.5 text-primary" />}
                                            {!['twitter', 'linkedin', 'facebook', 'instagram'].includes(s.platform_id) && <Share2 className="w-3.5 h-3.5 text-primary" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Social Share Dialog */}
            <Dialog open={showSocialShare} onOpenChange={setShowSocialShare}>
                <DialogContent className="sm:max-w-md bg-background border-border/40">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-primary" />
                            Postagem Multicanal
                        </DialogTitle>
                        <DialogDescription>
                            Selecione as redes sociais para publicar este conteúdo automaticamente.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/40 space-y-2">
                            <h4 className="text-sm font-semibold text-primary">Preview do Post</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 italic">"{item.rewritten_title || item.source_title}"</p>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {connectedSocials.map(platform => (
                                <div
                                    key={platform.platform_id}
                                    className="flex items-center justify-between p-3 rounded-xl bg-card border border-border/40 hover:border-primary/50 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-primary">
                                            {platform.platform_id === 'twitter' && <Twitter className="w-5 h-5" />}
                                            {platform.platform_id === 'linkedin' && <Zap className="w-5 h-5" />}
                                            {platform.platform_id === 'facebook' && <Facebook className="w-5 h-5" />}
                                            {platform.platform_id === 'instagram' && <Instagram className="w-5 h-5" />}
                                            {!['twitter', 'linkedin', 'facebook', 'instagram'].includes(platform.platform_id) && <Share2 className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold capitalize">{platform.platform_id}</p>
                                            <p className="text-[10px] text-primary flex items-center gap-1">
                                                <div className="w-1 h-1 rounded-full bg-primary" />
                                                Pronto
                                            </p>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="outline" className="h-8 rounded-lg hover:bg-primary hover:text-white transition-all">
                                        Postar
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowSocialShare(false)}>
                            Cancelar
                        </Button>
                        <Button
                            className="bg-primary hover:bg-primary/90 text-white gap-2 font-bold px-6"
                            onClick={() => {
                                toast.promise(new Promise(resolve => setTimeout(resolve, 2000)), {
                                    loading: 'Publicando...',
                                    success: 'Postado com sucesso!',
                                    error: 'Erro ao publicar.'
                                });
                                setShowSocialShare(false);
                            }}
                        >
                            <Send className="w-4 h-4" />
                            Enviar para Todos
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >

            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-background/95 backdrop-blur-xl border-white/5">
                    <DialogHeader className="p-8 border-b border-white/5 shrink-0 flex flex-row items-center justify-between space-y-0 bg-zinc-950">
                        <div className="flex flex-col gap-1">
                            <DialogTitle className="text-2xl font-black flex items-center gap-3 text-white">
                                <Monitor className="w-6 h-6 text-primary" />
                                PRÉ-VISUALIZAÇÃO DA POSTAGEM
                            </DialogTitle>
                            <DialogDescription className="text-white/40 font-medium">
                                Revise o conteúdo antes de publicar.
                            </DialogDescription>
                        </div>
                        <Button
                            variant={isQuickEditing ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => setIsQuickEditing(!isQuickEditing)}
                            className={cn(
                                "h-10 px-6 rounded-xl font-bold transition-all",
                                isQuickEditing ? "bg-emerald-500 text-white border-none" : "bg-white text-zinc-950 hover:bg-zinc-200 border-none px-8 font-bold"
                            )}
                        >
                            {isQuickEditing ? 'Modo Leitura' : 'Modo Edição'}
                        </Button>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-black">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* LEFT SIDE: SOURCE */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-2">
                                        <Rss className="w-3.5 h-3.5" />
                                        FONTE ORIGINAL
                                    </Label>
                                    <Badge variant="outline" className="text-[9px] h-5 border-white/10 font-bold bg-white/5 text-white/40">RSS</Badge>
                                </div>

                                <div className="relative group/source overflow-hidden rounded-2xl border border-white/5 bg-zinc-950 aspect-video flex items-center justify-center shadow-2xl">
                                    {/* LEFT: sempre mostra a imagem ORIGINAL do feed, nunca a reescrita */}
                                    {item.source_video ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-black">
                                            {item.source_video.includes('youtube.com') || item.source_video.includes('youtu.be') ? (
                                                <iframe
                                                    title="Source Video"
                                                    src={`https://www.youtube.com/embed/${item.source_video.includes('v=') ? item.source_video.split('v=')[1].split('&')[0] : item.source_video.split('/').pop()}`}
                                                    className="w-full h-full"
                                                    frameBorder="0"
                                                    allowFullScreen
                                                />
                                            ) : (
                                                <video controls src={item.source_video} className="w-full h-full" />
                                            )}
                                        </div>
                                    ) : item.source_image ? (
                                        <>
                                            <img
                                                src={getHighResImage(item.source_image) || item.source_image || ''}
                                                alt="Source"
                                                className={cn("w-full h-full object-cover transition-transform duration-700 group-hover/source:scale-105 opacity-60", sourceImageFailed && "hidden")}
                                                onError={() => setSourceImageFailed(true)}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/20" />
                                            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                                                <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Capturado do Feed</span>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 rounded-full bg-black/40 backdrop-blur-md opacity-0 group-hover/source:opacity-100 transition-opacity"
                                                    onClick={() => window.open(item.source_image!, '_blank')}
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5 text-white" />
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3 opacity-10">
                                            <Monitor className="w-10 h-10" />
                                            <span className="text-xs font-bold uppercase tracking-widest">Sem Conteúdo</span>
                                        </div>
                                    )}
                                </div>

                                {item.source_video && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 px-2 py-1 rounded bg-muted/20 border border-border/40">
                                            <Video className="w-3 h-3 text-primary" />
                                            <span className="text-[10px] text-muted-foreground truncate font-medium">{item.source_video}</span>
                                        </div>
                                        {item.feeds?.credit_source && item.feeds?.image_credit_text && (
                                            <p className="text-[10px] text-white/40 italic pl-2">
                                                Créditos: {item.feeds.image_credit_text}
                                            </p>
                                        )}
                                    </div>
                                )}
                                {!item.source_video && item.feeds?.credit_source && item.feeds?.image_credit_text && (
                                    <p className="text-[10px] text-white/40 italic mt-2 text-right">
                                        Créditos: {item.feeds.image_credit_text}
                                    </p>
                                )}
                            </div>

                            {/* RIGHT SIDE: OPTIMIZED */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary flex items-center gap-2">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        POSTAGEM OTIMIZADA
                                    </Label>
                                    <Badge className="text-[9px] h-5 bg-primary text-white font-bold border-none shadow-lg shadow-primary/20">AI STUDIO</Badge>
                                </div>
                                <div className={cn(
                                    "relative group/optimized overflow-hidden rounded-2xl border transition-all duration-500 aspect-video flex items-center justify-center shadow-2xl",
                                    rewrittenImage ? "border-primary/20 bg-zinc-950" : "border-dashed border-white/10 bg-white/[0.02]"
                                )}>
                                    {(() => {
                                        const safeRewritten = isBrokenUrl(rewrittenImage) ? null : rewrittenImage;

                                        return safeRewritten && !optimizedImageFailed ? (
                                            <>
                                                <img
                                                    src={getHighResImage(safeRewritten) || ''}
                                                    alt="Optimized"
                                                    className="w-full h-full object-cover animate-in fade-in duration-1000"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        setOptimizedImageFailed(true);
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30" />

                                                {/* Action Overlays */}
                                                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover/optimized:opacity-100 transition-all duration-300 bg-black/60 backdrop-blur-[2px] gap-2 z-20">
                                                    <Button
                                                        size="sm"
                                                        className="bg-white text-black hover:bg-zinc-200 font-bold h-10 px-6 rounded-full gap-2 shadow-2xl transition-transform active:scale-95"
                                                        onClick={() => handleTriggerRewrite(true)}
                                                        disabled={isProcessing || item.status === 'processing'}
                                                    >
                                                        <RotateCcw className={cn("w-4 h-4", (isProcessing || item.status === 'processing') && "animate-spin")} />
                                                        Regerar Apenas Imagem
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-white/60 hover:text-white h-8 text-[9px] uppercase tracking-widest font-bold"
                                                        onClick={() => handleTriggerRewrite(false)}
                                                        disabled={isProcessing || item.status === 'processing'}
                                                    >
                                                        Regerar Tudo (IA + Texto)
                                                    </Button>
                                                </div>

                                                {/* Status Badge */}
                                                <div className="absolute bottom-4 left-4 flex items-center gap-2 z-10">
                                                    {rewrittenImage ? (
                                                        <Badge className="bg-primary text-white border-none py-0 h-4 text-[8px] font-black uppercase tracking-tighter">HD IA</Badge>
                                                    ) : (
                                                        <Badge className="bg-white/20 text-white border-none py-0 h-4 text-[8px] font-black uppercase tracking-tighter">IMAGEM ORIGINAL</Badge>
                                                    )}
                                                    <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Pronta para publicar</span>
                                                </div>

                                                {/* Loading Overlay if processing */}
                                                {(isProcessing || item.status === 'processing') && (
                                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-30">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Processando...</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="absolute inset-0 p-8 flex flex-col items-center justify-center text-center">
                                                {(isProcessing || isAutoGenerating || item.status === 'processing') ? (
                                                    <div className="w-full max-w-[240px] space-y-5">
                                                        <div className="relative w-16 h-16 mx-auto">
                                                            <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
                                                            <div className="absolute inset-0 rounded-full border-2 border-primary/40" />
                                                            <Loader2 className="w-16 h-16 text-primary animate-spin absolute inset-0" />
                                                            <Sparkles className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-primary">
                                                                {isAutoGenerating ? 'GERANDO IMAGEM AI...' : 'PROCESSANDO...'}
                                                            </p>
                                                            {isAutoGenerating && (
                                                                <p className="text-[9px] text-white/30 uppercase tracking-widest">
                                                                    Recriando com IA automaticamente
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-5">
                                                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto border border-white/10">
                                                            <Wand2 className="w-8 h-8 text-white/40" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-black text-white uppercase tracking-widest">Transformar Imagem</p>
                                                            <p className="text-[10px] text-white/30 max-w-[220px] mx-auto leading-relaxed uppercase tracking-tighter">
                                                                A IA vai recriar a imagem original com nova composição e ângulo.
                                                            </p>
                                                        </div>
                                                        <div className="flex flex-col gap-2 items-center">
                                                            <Button
                                                                onClick={() => handleTriggerRewrite(true)}
                                                                className="bg-primary hover:opacity-90 text-white font-black px-8 h-12 rounded-xl shadow-xl shadow-primary/20 gap-3 active:scale-95 transition-all"
                                                            >
                                                                <Sparkles className="w-4 h-4" />
                                                                GERAR IMAGEM
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleTriggerRewrite(false)}
                                                                className="text-white/30 hover:text-white text-[9px] uppercase tracking-widest h-8"
                                                            >
                                                                Reescrever Tudo (IA + Imagem)
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-12">
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">TÍTULO</Label>
                                {isQuickEditing ? (
                                    <Input
                                        value={editedTitle}
                                        onChange={(e) => setEditedTitle(e.target.value)}
                                        className="font-bold text-xl bg-white/5 border-white/10 text-white h-14 rounded-xl px-6 focus:ring-primary/20 focus:border-primary/40"
                                    />
                                ) : (
                                    <h2 className="text-4xl md:text-5xl font-black leading-[1.1] tracking-tight text-white animate-in slide-in-from-bottom-4 duration-700">
                                        {safeParseAiContent(editedTitle, editedContent).title || item.source_title}
                                    </h2>
                                )}
                            </div>
                            <div className="space-y-5">
                                <Label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">CONTEÚDO</Label>
                                {isQuickEditing ? (
                                    <Textarea
                                        value={editedContent}
                                        onChange={(e) => setEditedContent(e.target.value)}
                                        className="min-h-[400px] text-lg leading-relaxed bg-white/5 border-white/10 text-white/80 rounded-xl p-6 focus:ring-emerald-500/20 focus:border-emerald-500/40"
                                    />
                                ) : (
                                    <div
                                        className="text-white/80 leading-relaxed text-lg pb-10 animate-in fade-in slide-in-from-bottom-2 duration-1000 prose prose-invert prose-headings:text-white prose-p:text-white/80 prose-headings:font-black prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 max-w-none"
                                        dangerouslySetInnerHTML={{
                                            __html: sanitizeHTML((safeParseAiContent(editedTitle, editedContent).content || item.source_content || '')
                                                .replace(/\n\n/g, '<br/><br/>'))
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="p-8 bg-zinc-950 border-t border-white/5 shrink-0 flex flex-row items-center justify-between gap-4">
                        <Button
                            variant="ghost"
                            className="font-bold px-8 h-14 text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                            onClick={() => setShowPreview(false)}
                        >
                            Fechar
                        </Button>
                        <Button
                            className="bg-emerald-500 hover:bg-emerald-600 text-white font-black px-12 h-14 rounded-xl shadow-2xl shadow-emerald-500/30 transition-all active:scale-95 gap-3"
                            onClick={() => handleQuickApprove()}
                        >
                            <CheckCircle className="w-5 h-5" />
                            <span className="uppercase tracking-widest text-xs">
                                {(item.status as string) === 'ready' ? 'Publicar Tudo' : (isQuickEditing ? 'Salvar e Aprovar' : 'Aprovar')}
                            </span>
                        </Button>
                        {connectedPlatforms.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="h-14 w-12 rounded-xl border-white/5 bg-white/5 text-white">
                                        <ChevronDown className="w-5 h-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64 bg-zinc-950 border-white/10 text-white p-2">
                                    <div className="px-2 py-2 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Destinos Disponíveis</div>
                                    <DropdownMenuSeparator className="bg-white/5" />
                                    {connectedPlatforms.map(platform => (
                                        <DropdownMenuItem
                                            key={platform.platform_id}
                                            onClick={() => handleQuickApprove(platform.platform_id)}
                                            className="gap-3 cursor-pointer focus:bg-emerald-500 focus:text-white p-3 rounded-lg mb-1"
                                        >
                                            <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center shrink-0">
                                                {platform.platform_id === 'wordpress' && <Globe className="w-4 h-4 text-blue-400" />}
                                                {platform.platform_id === 'blogger' && <span className="text-base">🅱️</span>}
                                                {platform.platform_id === 'custom_api' && <span className="text-base">🌐</span>}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-black text-xs uppercase tracking-wider capitalize">{platform.platform_id}</span>
                                                <span className="text-[9px] text-white/40">Postagem Direta</span>
                                            </div>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </DialogFooter>
                </DialogContent >
            </Dialog >
        </>
    );
}
