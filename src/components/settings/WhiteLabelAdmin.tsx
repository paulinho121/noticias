import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Building2, Globe, Mail, Palette, Sparkles, Image as ImageIcon, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WhiteLabelAdmin() {
    const { settings, refreshSettings } = useWhiteLabel();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        app_name: '',
        hero_title: '',
        hero_subtitle: '',
        support_email: '',
        logo_url: '',
        favicon_url: '',
        primary_color: ''
    });

    useEffect(() => {
        if (settings) {
            setFormData({
                app_name: settings.app_name || '',
                hero_title: settings.hero_title || '',
                hero_subtitle: settings.hero_subtitle || '',
                support_email: settings.support_email || '',
                logo_url: settings.logo_url || '',
                favicon_url: settings.favicon_url || '',
                primary_color: settings.primary_color || '#0066FF'
            });
        }
    }, [settings]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setLoading(true);
            const fileName = `${type}-${Math.random()}.${file.name.split('.').pop()}`;
            const { data, error } = await supabase.storage
                .from('brand_assets')
                .upload(fileName, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('brand_assets')
                .getPublicUrl(fileName);

            setFormData(prev => ({ ...prev, [type === 'logo' ? 'logo_url' : 'favicon_url']: publicUrl }));
            toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} enviado com sucesso!`);
        } catch (error: any) {
            toast.error('Erro no upload: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            // 1. Get Org ID
            console.log('Buscando organização para usuário:', session.user.id);
            const { data: memberData, error: memberError } = await (supabase as any)
                .from('organization_members')
                .select('organization_id')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (memberError) {
                console.error('Erro ao buscar membro da organização:', memberError);
                throw memberError;
            }

            if (!memberData) {
                console.warn('Nenhum registro encontrado em organization_members para este usuário.');
                throw new Error('Organização não encontrada. Certifique-se de que seu usuário está vinculado a uma organização no banco de dados.');
            }

            console.log('Organização encontrada:', memberData.organization_id);

            // 2. Update Org Branding
            const { error: orgError } = await (supabase as any)
                .from('organizations')
                .update({
                    logo_url: formData.logo_url,
                    favicon_url: formData.favicon_url,
                    primary_color: formData.primary_color
                })
                .eq('id', memberData.organization_id);

            if (orgError) throw orgError;

            // 3. Update White Label Settings (Usando UPSERT para garantir que a linha exista)
            const { error: wlError } = await (supabase as any)
                .from('white_label_settings')
                .upsert({
                    organization_id: memberData.organization_id,
                    app_name: formData.app_name,
                    hero_title: formData.hero_title,
                    hero_subtitle: formData.hero_subtitle,
                    support_email: formData.support_email,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'organization_id' });

            if (wlError) throw wlError;

            toast.success('Configurações White Label atualizadas!');
            await refreshSettings();
        } catch (error: any) {
            toast.error('Erro ao salvar: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="glass-card p-6 border-primary/20 bg-primary/5 mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Painel de Customização White Label
                </h3>
                <p className="text-sm text-muted-foreground">
                    Como administrador, você pode alterar toda a identidade visual da sua instância para revenda ou uso corporativo.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="glass-card p-6 space-y-4">
                    <h4 className="font-semibold flex items-center gap-2 border-b pb-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        Identidade da Marca
                    </h4>

                    <div className="space-y-2">
                        <Label htmlFor="app_name">Nome do Aplicativo</Label>
                        <Input
                            id="app_name"
                            value={formData.app_name}
                            onChange={e => setFormData(prev => ({ ...prev, app_name: e.target.value }))}
                            placeholder="Ex: MinhaAgencia AI"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Logotipo da Marca</Label>
                        <div className="flex items-center gap-6 p-4 rounded-xl bg-muted/20 border border-border/40">
                            <div className="relative group shrink-0">
                                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-primary/20 bg-background flex items-center justify-center overflow-hidden">
                                    {formData.logo_url ? (
                                        <img src={formData.logo_url} className="w-full h-full object-contain" alt="Logo" />
                                    ) : (
                                        <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                                    )}
                                </div>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, 'logo')}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs font-bold text-primary/80 uppercase">Upload Logo</Label>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">Formatos PNG, SVG ou JPG. Recomendado: fundo transparente.</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Favicon do Navegador</Label>
                        <div className="flex items-center gap-6 p-4 rounded-xl bg-muted/20 border border-border/40">
                            <div className="relative group shrink-0">
                                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-primary/20 bg-background flex items-center justify-center overflow-hidden">
                                    {formData.favicon_url ? (
                                        <img src={formData.favicon_url} className="w-full h-full object-contain" alt="Favicon" />
                                    ) : (
                                        <Globe className="w-6 h-6 text-muted-foreground/40" />
                                    )}
                                </div>
                                <Input
                                    type="file"
                                    accept=".ico,image/png"
                                    onChange={(e) => handleFileUpload(e, 'favicon')}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs font-bold text-primary/80 uppercase">Upload Favicon</Label>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">Ícone que aparece na aba do navegador. Use 32x32 ou 64x64px.</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="support_email">E-mail de Suporte</Label>
                        <Input
                            id="support_email"
                            type="email"
                            value={formData.support_email}
                            onChange={e => setFormData(prev => ({ ...prev, support_email: e.target.value }))}
                            placeholder="suporte@suaagencia.com"
                        />
                    </div>
                </div>

                {/* Hero Section */}
                <div className="glass-card p-6 space-y-4">
                    <h4 className="font-semibold flex items-center gap-2 border-b pb-2">
                        <Globe className="w-4 h-4 text-primary" />
                        Landing Page / Dashboard
                    </h4>

                    <div className="space-y-2">
                        <Label htmlFor="hero_title">Título Principal</Label>
                        <Input
                            id="hero_title"
                            value={formData.hero_title}
                            onChange={e => setFormData(prev => ({ ...prev, hero_title: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="hero_subtitle">Subtítulo / Descrição</Label>
                        <Input
                            id="hero_subtitle"
                            value={formData.hero_subtitle}
                            onChange={e => setFormData(prev => ({ ...prev, hero_subtitle: e.target.value }))}
                        />
                    </div>
                </div>

                {/* Design Settings */}
                <div className="glass-card p-6 space-y-4 md:col-span-2">
                    <h4 className="font-semibold flex items-center gap-2 border-b pb-2">
                        <Palette className="w-4 h-4 text-primary" />
                        Design e Cores
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Cor Primária (HEX Customizado)</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="color"
                                    className="w-12 h-10 p-1 cursor-pointer bg-transparent border-white/10"
                                    value={formData.primary_color}
                                    onChange={e => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                                />
                                <Input
                                    value={formData.primary_color}
                                    onChange={e => setFormData(prev => ({ ...prev, primary_color: e.target.value }))}
                                    className="font-mono uppercase bg-transparent border-white/10"
                                    maxLength={7}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={loading} className="gap-2 px-8">
                    <Save className="w-4 h-4" />
                    {loading ? 'Salvando...' : 'Aplicar Configurações White Label'}
                </Button>
            </div>
        </div>
    );
}
