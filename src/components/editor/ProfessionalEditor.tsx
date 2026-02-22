import { useState, useEffect } from 'react';
import { FeedItem } from '@/lib/api';
import {
    X,
    Sparkles,
    RotateCcw,
    Check,
    Type,
    Languages,
    ShieldCheck,
    History,
    Info,
    ChevronRight,
    Send,
    Wand2,
    Trash2,
    Maximize2,
    Minimize2,
    Image,
    Clock,
    Loader2,
    Upload,
    XCircle,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup
} from '@/components/ui/resizable';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn, safeParseAiContent, getHighResImage } from '@/lib/utils';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { feedsApi } from '@/lib/api';
import { Label } from '@/components/ui/label';

interface ProfessionalEditorProps {
    item: FeedItem;
    isOpen: boolean;
    onClose: () => void;
    onSave: (id: string, updates: Partial<FeedItem>) => void;
    onRewrite: (params: { itemId: string, title: string, content: string, tone?: string, onlyImage?: boolean, feedId?: string, customImagePrompt?: string, customSourceImageB64?: string }) => Promise<any>;
}

export function ProfessionalEditor({ item, isOpen, onClose, onSave, onRewrite }: ProfessionalEditorProps) {
    const isNew = item.id.startsWith('manual-');
    const initialDisplay = safeParseAiContent(item.rewritten_title || item.source_title || '', item.rewritten_content || item.source_content || '');
    const [editedTitle, setEditedTitle] = useState(initialDisplay.title || '');
    const [editedContent, setEditedContent] = useState(initialDisplay.content || '');
    const [editedSlug, setEditedSlug] = useState(item.slug || '');
    const [editedMetaDescription, setEditedMetaDescription] = useState(item.meta_description || '');
    const [editedSocialSummary, setEditedSocialSummary] = useState(item.social_summary || '');
    const [editedTags, setEditedTags] = useState(item.tags?.join(', ') || '');
    const [editedKeywords, setEditedKeywords] = useState(item.keywords?.join(', ') || '');
    const [editedImage, setEditedImage] = useState(item.rewritten_image || '');
    const [useOriginalImage, setUseOriginalImage] = useState(!item.rewritten_image);
    const [selectedFeedId, setSelectedFeedId] = useState(item.feed_id || '');
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [customImagePrompt, setCustomImagePrompt] = useState('');
    const [customSourceImageB64, setCustomSourceImageB64] = useState<string | null>(null);
    const [customSourceImagePreview, setCustomSourceImagePreview] = useState<string | null>(null);
    const [score, setScore] = useState(0);

    useEffect(() => {
        // Calculate a basic health score
        let newScore = 0;
        if (editedTitle.length > 30) newScore += 20;
        if (editedContent.length > 500) newScore += 30;
        if (editedSlug) newScore += 15;
        if (editedMetaDescription) newScore += 15;
        if (editedKeywords) newScore += 10;
        if (editedTags) newScore += 10;
        setScore(newScore);
    }, [editedTitle, editedContent, editedSlug, editedMetaDescription, editedKeywords, editedTags]);

    const { data: feeds = [] } = useQuery({ queryKey: ['feeds'], queryFn: feedsApi.getAll });

    const isBrokenUrl = (url: string | null | undefined) =>
        !url ||
        url.includes('oaidalleapiprodscus.blob.core.windows.net') ||
        url === 'placeholder.jpeg';

    const [previewImage, setPreviewImage] = useState(() => {
        const url = item.rewritten_image || item.source_image;
        return isBrokenUrl(url) ? '' : (url || '');
    });
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const display = safeParseAiContent(item.rewritten_title || item.source_title || '', item.rewritten_content || item.source_content || '');
            setEditedTitle(display.title || '');
            setEditedContent(display.content || '');
            setEditedSlug(item.slug || display.slug || '');
            setEditedMetaDescription(item.meta_description || display.metaDescription || '');
            setEditedSocialSummary(item.social_summary || display.socialSummary || '');
            setEditedTags(item.tags?.length ? item.tags.join(', ') : (display.tags?.join(', ') || ''));
            setEditedKeywords(item.keywords?.length ? item.keywords.join(', ') : (display.keywords?.join(', ') || ''));
            setEditedImage(item.rewritten_image || '');
            setUseOriginalImage(!item.rewritten_image);
            setSelectedFeedId(item.feed_id || (feeds[0]?.id || ''));
            setImageFailed(false);
        }
    }, [isOpen, item, feeds]);

    useEffect(() => {
        const imgUrl = editedImage || item.source_image;
        if (isBrokenUrl(imgUrl)) {
            setPreviewImage('');
        } else {
            setPreviewImage(getHighResImage(imgUrl) || '');
        }
    }, [editedImage, item.source_image]);

    if (!isOpen) return null;



    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            toast.error('Imagem muito grande. Limite: 10MB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            // dataUrl = "data:image/jpeg;base64,...." — extract only the base64 part
            const b64 = dataUrl.split(',')[1];
            setCustomSourceImageB64(b64);
            setCustomSourceImagePreview(dataUrl);
            toast.success('Imagem carregada! Defina o prompt e clique em Gerar.');
        };
        reader.readAsDataURL(file);
    };

    const handleGenerateImage = async () => {
        setIsGeneratingImage(true);
        try {
            const result = await onRewrite({
                itemId: item.id,
                title: editedTitle,
                content: editedContent,
                onlyImage: true,
                feedId: selectedFeedId,
                customImagePrompt: customImagePrompt.trim() || undefined,
                customSourceImageB64: customSourceImageB64 || undefined,
            });

            if (result?.rewritten?.rewritten_image) {
                setEditedImage(result.rewritten.rewritten_image);
                setUseOriginalImage(false);
                toast.success("Nova imagem gerada com sucesso!");
            } else if (result?.success) {
                toast.success("A geração de imagem foi iniciada em segundo plano. Ela aparecerá aqui em instantes.");
            }
        } catch (error: any) {
            console.error('Erro ao gerar imagem:', error);
            toast.error(error?.message || "Erro ao gerar imagem.");
        } finally {
            setIsGeneratingImage(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-md animate-in fade-in duration-300">
            {/* Header */}
            <header className="h-16 border-b border-border/40 flex items-center justify-between px-4 md:px-6 bg-card/50 backdrop-blur-xl shrink-0">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-xs md:text-sm font-semibold text-foreground flex items-center gap-2 truncate">
                            {isNew ? 'Nova Redação' : 'Editor AI'}
                            <Badge variant="secondary" className="text-[9px] md:text-[10px] h-4 md:h-5 px-1 bg-primary/10 text-primary border-primary/20 hidden sm:flex">
                                {isNew ? 'MANUAL' : 'PRO'}
                            </Badge>
                        </h2>
                        <p className="text-[9px] md:text-[11px] text-muted-foreground uppercase tracking-widest font-medium truncate">
                            {isNew ? 'Escrita Individual' : 'Co-Criação'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 md:gap-3">
                    {isNew && (
                        <div className="hidden lg:flex items-center gap-2 mr-4 bg-muted/30 px-3 py-1.5 rounded-full border border-border/50">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Projeto:</Label>
                            <select
                                value={selectedFeedId}
                                onChange={(e) => setSelectedFeedId(e.target.value)}
                                className="bg-transparent border-none text-xs font-semibold focus:ring-0 cursor-pointer"
                            >
                                {feeds.map(f => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 md:h-9 w-8 md:w-9 p-0 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                        onClick={onClose}
                    >
                        <X className="w-4 h-4 md:w-5 md:h-5" />
                    </Button>

                    <Button
                        className="h-8 md:h-9 px-3 md:px-6 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all shadow-lg shadow-primary/20 gap-2 text-[10px] md:text-sm"
                        onClick={() => {
                            onSave(item.id, {
                                feed_id: selectedFeedId,
                                rewritten_title: editedTitle,
                                rewritten_content: editedContent,
                                slug: editedSlug,
                                meta_description: editedMetaDescription,
                                social_summary: editedSocialSummary,
                                rewritten_image: editedImage || (useOriginalImage ? null : item.rewritten_image),
                                tags: editedTags.split(',').map(t => t.trim()).filter(Boolean),
                                keywords: editedKeywords.split(',').map(k => k.trim()).filter(Boolean)
                            });
                            onClose();
                        }}
                    >
                        <Check className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        <span className="hidden sm:inline">
                            {isNew ? 'Criar Postagem' : (item.status === 'ready' ? 'Salvar e Publicar' : 'Salvar e Aprovar')}
                        </span>
                        <span className="sm:hidden">Salvar</span>
                    </Button>
                </div>
            </header>

            {/* Main Workspace */}
            <div className="flex-1 overflow-hidden">
                <div className="md:hidden h-full flex flex-col">
                    <ScrollArea className="flex-1">
                        <div className="p-4 space-y-6">
                            {/* Mobile Tabs/Sections indicator could go here, but simple scroll is better for now */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Título da Publicação</label>
                                <Input
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                    className="text-xl font-bold bg-muted/20 border-border/40"
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-primary uppercase tracking-widest">Conteúdo Principal</label>
                                <Textarea
                                    value={editedContent}
                                    onChange={(e) => setEditedContent(e.target.value)}
                                    className="min-h-[300px] text-md leading-relaxed bg-muted/10 border-border/40 font-serif"
                                />
                            </div>

                            <Separator className="bg-border/40" />



                            <div className="p-4 rounded-xl bg-muted/30 border border-border/40">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Referência Original</p>
                                <h4 className="text-sm font-semibold mb-2">{item.source_title}</h4>
                                <p className="text-xs text-muted-foreground/80 line-clamp-3">{item.source_content}</p>
                            </div>
                        </div>
                    </ScrollArea>
                </div>

                <div className="hidden md:block h-full">
                    <ResizablePanelGroup direction="horizontal">
                        {/* Left Panel: Comparison/Reference */}
                        <ResizablePanel defaultSize={25} minSize={20} className="bg-muted/30 border-r border-border/40">
                            <ScrollArea className="h-full">
                                <div className="p-8 space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                            <History className="w-3 h-3 text-primary/60" />
                                            FONTE ORIGINAL
                                        </div>
                                        <h3 className="text-lg font-serif italic text-muted-foreground/80 leading-snug">
                                            {item.source_title}
                                        </h3>
                                        <div className="text-sm text-muted-foreground/70 leading-relaxed font-light">
                                            {item.source_content || 'Sem conteúdo original para comparar.'}
                                        </div>
                                    </div>

                                    <Separator className="bg-border/40" />

                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                            <Info className="w-3 h-3 text-primary/60" />
                                            RESUMO DA FONTE
                                        </div>
                                        <div className="p-4 rounded-xl bg-card border border-border/50 space-y-3">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-muted-foreground">Sentimento</span>
                                                <span className="text-success font-medium">Neutro</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-muted-foreground">Entidades</span>
                                                <span className="text-foreground font-medium">3 encontradas</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                        </ResizablePanel>

                        <ResizableHandle withHandle className="bg-border/40" />

                        {/* Center Panel: Interactive Editor */}
                        <ResizablePanel defaultSize={50} minSize={40}>
                            <div className="h-full flex flex-col bg-card/30">
                                <div className="h-12 border-b border-border/40 flex items-center px-6 justify-between bg-card/50">
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground">
                                            <Type className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground">
                                            <Languages className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground font-mono">
                                        {editedContent.length} caracteres | {editedContent.split(/\s+/).filter(Boolean).length} palavras
                                    </div>
                                </div>

                                <ScrollArea className="flex-1">
                                    <div className="max-w-3xl mx-auto p-12 space-y-12 relative">
                                        {/* Image Selection Area - Moved to Top */}
                                        <div className="space-y-4">
                                            <label className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] flex items-center gap-2">
                                                <Image className="w-3.5 h-3.5" />
                                                Capa da Publicação (Preview)
                                            </label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                                <div className="relative aspect-video rounded-xl overflow-hidden border border-border/40 shadow-sm bg-muted/20 group flex items-center justify-center">
                                                    {isGeneratingImage ? (
                                                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4 bg-primary/5 animate-in fade-in zoom-in duration-500">
                                                            <div className="flex flex-col items-center gap-3">
                                                                <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                                                                <div className="space-y-1">
                                                                    <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] animate-pulse">
                                                                        Gerando Nova Imagem...
                                                                    </p>
                                                                    <p className="text-[9px] text-muted-foreground italic">Processando via AI Creative Studio v4.0</p>
                                                                </div>
                                                            </div>
                                                            <Progress value={50} className="h-1.5 w-full max-w-[200px] bg-primary/10" />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {previewImage && !imageFailed ? (
                                                                <img
                                                                    src={previewImage}
                                                                    alt="Preview"
                                                                    className="w-full h-full object-cover"
                                                                    onError={() => setImageFailed(true)}
                                                                />
                                                            ) : (
                                                                <div className="flex flex-col items-center gap-2 text-muted-foreground/40 opacity-50">
                                                                    <Image className="w-10 h-10" />
                                                                    <span className="text-[10px] font-bold uppercase tracking-widest">Sem Imagem</span>
                                                                </div>
                                                            )}
                                                            {editedImage && (
                                                                <div className="absolute top-2 right-2">
                                                                    <Badge className="bg-primary text-white text-[8px] font-bold uppercase tracking-widest px-2 py-0.5">IA ATIVA</Badge>
                                                                </div>
                                                            )}
                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20 h-9 px-4 rounded-full font-bold text-[10px] uppercase tracking-wider"
                                                                    onClick={handleGenerateImage}
                                                                    disabled={isGeneratingImage}
                                                                >
                                                                    <Sparkles className="w-3.5 h-3.5 mr-2" /> Gerar Nova com IA
                                                                </Button>
                                                                {editedImage && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="text-white/60 hover:text-white h-8 text-[9px] uppercase tracking-widest font-bold"
                                                                        onClick={() => setEditedImage('')}
                                                                    >
                                                                        <X className="w-3 h-3 mr-2" /> Remover
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Link da Imagem</Label>
                                                        <Input
                                                            value={editedImage}
                                                            onChange={(e) => setEditedImage(e.target.value)}
                                                            className="bg-muted/20 border-border/40 text-xs"
                                                            placeholder="URL da Imagem (https://...)"
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                                                        Dica: A imagem acima aparecerá como capa do seu post. Você pode usar uma URL externa ou gerar uma nova com IA.
                                                    </p>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full h-9 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-[10px] uppercase"
                                                        onClick={handleGenerateImage}
                                                        disabled={isGeneratingImage}
                                                    >
                                                        <Wand2 className="w-3.5 h-3.5 mr-2" /> Re-gerar Capa com IA
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        <input
                                            type="text"
                                            value={editedTitle}
                                            onChange={(e) => setEditedTitle(e.target.value)}
                                            className="w-full bg-transparent border-none text-4xl font-bold focus:ring-0 placeholder:text-muted-foreground/30 text-foreground selection:bg-primary/20 tracking-tight"
                                            placeholder="Título da sua reportagem..."
                                        />

                                        <div className="flex items-center gap-6 text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.2em] border-y border-border/20 py-3">
                                            <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> IA ACTIVE</span>
                                            <span className="flex items-center gap-2 font-mono"><Clock className="w-3 h-3" /> {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            {isNew && <span className="flex items-center gap-2 text-primary"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> MODO REDAÇÃO PRÓPRIA</span>}
                                        </div>

                                        <textarea
                                            value={editedContent}
                                            onChange={(e) => setEditedContent(e.target.value)}
                                            className="w-full min-h-[600px] bg-transparent border-none focus:ring-0 text-xl leading-[1.8] text-foreground/90 resize-none placeholder:text-muted-foreground/20 selection:bg-primary/20 font-serif"
                                            placeholder="Comece a escrever sua história aqui ou use o Assistente AI ao lado para expandir suas ideias..."
                                        />


                                    </div>


                                </ScrollArea>
                            </div>
                        </ResizablePanel>

                        <ResizableHandle withHandle className="bg-border/40" />

                        {/* Right Panel: AI Assistance Panel */}
                        <ResizablePanel defaultSize={25} minSize={20} className="bg-card/50 backdrop-blur-md">
                            <div className="h-full flex flex-col">
                                <div className="p-6 border-b border-border/40">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                                        <Wand2 className="w-3.5 h-3.5 text-primary" />
                                        Assistente de Estilo
                                    </h4>
                                </div>

                                <ScrollArea className="flex-1">
                                    <div className="p-6 space-y-8">
                                        <div className="space-y-4">
                                            <div className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/10 mt-4 shadow-inner relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-orange-500/10 transition-colors" />
                                                <div className="flex justify-between items-end mb-2 relative z-10">
                                                    <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-1.5">
                                                        <ShieldCheck className="w-3.5 h-3.5" />
                                                        PROFESSIONAL SCORE
                                                    </span>
                                                    <span className="text-xl font-black text-orange-500">{score}%</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden relative z-10">
                                                    <div
                                                        className="h-full bg-orange-500 rounded-full shadow-[0_0_12px_rgba(249,115,22,0.4)] transition-all duration-1000 ease-out"
                                                        style={{ width: `${score}%` }}
                                                    />
                                                </div>
                                                <p className="text-[9px] text-muted-foreground mt-3 leading-relaxed italic relative z-10">
                                                    {score < 50 ? "Conteúdo em rascunho. Recomendamos preencher metadados SEO e expandir o texto." :
                                                        score < 80 ? "Qualidade profissional detectada. Ótimo equilíbrio entre SEO e legibilidade." :
                                                            "Configuração Premium! Postagem pronta para alta performance em motores de busca."}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-xs font-medium text-muted-foreground pl-1">SEO & REDES SOCIAIS</label>
                                            <div className="p-4 space-y-4 rounded-xl bg-card border border-border/50">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Slug da URL</label>
                                                    <Input
                                                        value={editedSlug}
                                                        onChange={(e) => setEditedSlug(e.target.value)}
                                                        className="h-8 text-xs bg-muted/20"
                                                        placeholder="exemplo-de-url"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Meta Descrição</label>
                                                    <Textarea
                                                        value={editedMetaDescription}
                                                        onChange={(e) => setEditedMetaDescription(e.target.value)}
                                                        className="min-h-[60px] text-xs bg-muted/10 resize-none"
                                                        placeholder="Descrição para Google..."
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Resumo Social</label>
                                                    <Textarea
                                                        value={editedSocialSummary}
                                                        onChange={(e) => setEditedSocialSummary(e.target.value)}
                                                        className="min-h-[60px] text-xs bg-muted/10 resize-none"
                                                        placeholder="Resumo para Twitter/Insta..."
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Palavras-chave</label>
                                                    <Input
                                                        value={editedKeywords}
                                                        onChange={(e) => setEditedKeywords(e.target.value)}
                                                        className="h-8 text-xs bg-muted/20"
                                                        placeholder="separadas por vírgula"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Tags</label>
                                                    <Input
                                                        value={editedTags}
                                                        onChange={(e) => setEditedTags(e.target.value)}
                                                        className="h-8 text-xs bg-muted/20"
                                                        placeholder="separadas por vírgula"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-xs font-medium text-muted-foreground pl-1 uppercase tracking-wider">Gerador Visual IA</label>
                                            <div className="p-4 rounded-xl bg-card border border-border/50 space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                                        <Image className="w-4 h-4 text-indigo-500" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-xs font-bold leading-none">Recriar Fotografia</p>
                                                        <p className="text-[9px] text-muted-foreground mt-1">Gera uma imagem ultra-realista baseada no título</p>
                                                    </div>
                                                </div>

                                                {/* Image Upload Area */}
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                                        <Upload className="w-2.5 h-2.5 text-indigo-400" />
                                                        Sua Imagem de Referência (Opcional)
                                                    </label>
                                                    {customSourceImagePreview ? (
                                                        <div className="relative rounded-lg overflow-hidden border border-indigo-500/30 bg-indigo-500/5">
                                                            <img
                                                                src={customSourceImagePreview}
                                                                alt="Referência"
                                                                className="w-full h-24 object-cover"
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-all flex items-center justify-center">
                                                                <button
                                                                    onClick={() => { setCustomSourceImageB64(null); setCustomSourceImagePreview(null); }}
                                                                    className="flex items-center gap-1 text-white text-[10px] font-bold bg-red-500/80 px-3 py-1.5 rounded-full"
                                                                >
                                                                    <XCircle className="w-3 h-3" /> Remover
                                                                </button>
                                                            </div>
                                                            <div className="absolute top-1 right-1">
                                                                <span className="text-[8px] font-bold bg-indigo-500 text-white px-1.5 py-0.5 rounded-full uppercase">Referência ativa</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-dashed border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 cursor-pointer transition-colors">
                                                            <Upload className="w-5 h-5 text-indigo-400/60" />
                                                            <span className="text-[9px] text-muted-foreground text-center">Arraste ou clique para enviar<br />JPG, PNG, WEBP até 10MB</span>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={handleImageUpload}
                                                            />
                                                        </label>
                                                    )}
                                                </div>

                                                {/* Custom Image Prompt */}
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                                        <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
                                                        Prompt Personalizado (Opcional)
                                                    </label>
                                                    <Textarea
                                                        value={customImagePrompt}
                                                        onChange={(e) => setCustomImagePrompt(e.target.value)}
                                                        className="min-h-[72px] text-[10px] bg-indigo-500/5 border-indigo-500/20 resize-none placeholder:text-muted-foreground/40 focus:border-indigo-500/40"
                                                        placeholder={customSourceImagePreview
                                                            ? "Descreva como modificar sua imagem..."
                                                            : "Ex: 'Fotografia noturna, estilo cinematográfico...' — deixe vazio para geração automática"}
                                                    />
                                                    {(customImagePrompt.trim() || customSourceImageB64) && (
                                                        <div className="flex items-center gap-1.5 text-[9px] text-indigo-400 font-medium">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                                            {customSourceImageB64 && customImagePrompt.trim()
                                                                ? 'Imagem + Prompt ativos — remix completo'
                                                                : customSourceImageB64
                                                                    ? 'Imagem de referência ativa'
                                                                    : 'Prompt personalizado ativo'}
                                                        </div>
                                                    )}
                                                </div>

                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="w-full text-[10px] font-bold h-8 uppercase tracking-widest bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                                                    onClick={handleGenerateImage}
                                                    disabled={isGeneratingImage}
                                                >
                                                    <Sparkles className={cn("w-3 h-3 mr-2", isGeneratingImage && "animate-spin")} />
                                                    {isGeneratingImage ? "Gerando..."
                                                        : customSourceImageB64 && customImagePrompt.trim() ? "Fazer Remix com IA"
                                                            : customSourceImageB64 ? "Recriar a Partir da Minha Imagem"
                                                                : customImagePrompt.trim() ? "Gerar com Meu Prompt"
                                                                    : "Gerar Nova Foto com IA"}
                                                </Button>
                                            </div>
                                        </div>


                                    </div>
                                </ScrollArea>
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </div>

            {/* Quick Footer Stats */}
            <footer className="h-10 border-t border-border/40 flex items-center justify-between px-6 bg-card/30 text-[10px] text-muted-foreground font-medium uppercase tracking-widest shrink-0 hidden sm:flex">
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-success" /> Conteúdo Original Verificado</span>
                    <span className="flex items-center gap-1.5 font-sans"><Languages className="w-3 h-3" /> Tradução Automática (PT-BR)</span>
                </div>
                <div className="flex items-center gap-4">
                    Status: <span className="text-primary">Editando em tempo real</span>
                </div>
            </footer>
        </div>
    );
}
