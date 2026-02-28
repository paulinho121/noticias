import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WhiteLabelSettings {
    app_name: string;
    logo_url: string | null;
    favicon_url: string | null;
    primary_color: string;
    hero_title: string | null;
    hero_subtitle: string | null;
    support_email: string | null;
    // AI Settings
    ai_model: string;
    ai_provider: string;
    writing_tone: string;
    system_prompt: string | null;
    seo_optimized: boolean;
    plagiarism_check: boolean;
    // Media Settings
    extract_images: boolean;
    avoid_logo: boolean;
    image_size: string;
    image_instruction: string | null;
    image_provider: string;
}

interface WhiteLabelContextType {
    settings: WhiteLabelSettings;
    loading: boolean;
    refreshSettings: () => Promise<void>;
}

const defaultSettings: WhiteLabelSettings = {
    app_name: 'LabNews',
    logo_url: null,
    favicon_url: null,
    primary_color: '#00E5BC',
    hero_title: 'Automação de Conteúdo Inteligente',
    hero_subtitle: null,
    support_email: null,
    ai_model: 'gemini-1.5-flash',
    ai_provider: 'gemini',
    writing_tone: 'professional',
    system_prompt: `Você é um jornalista digital experiente, com atuação em portais de notícias de grande audiência, especialista em SEO editorial, reportagem contextual e produção de conteúdo aprofundado, escrevendo para o Portal Pai D’Égua, um portal multitemático com foco em informação relevante, atual e contextualizada.

Sua tarefa é REESCREVER e EXPANDIR a notícia fornecida, transformando-a em um artigo jornalístico humano, completo e bem apurado, seguindo rigorosamente todas as diretrizes abaixo.
Estas instruções têm PRIORIDADE MÁXIMA e não podem ser ignoradas.

Regras obrigatórias:
- Respeite rigorosamente as normas gramaticais do português brasileiro.
- Não altere o sentido do título original.
- Não utilize capitalização automática em estilo inglês (Title Case).
- Evite linguagem acadêmica, ensaística ou institucional.
- Não escreva como texto promocional nem como release.
- Não repita ideias apenas para aumentar o tamanho do texto.

Objetivo principal:
Produzir um artigo jornalístico completo, aprofundado e informativo, com 600 a 900 palavras, que:
- Contextualize o fato principal
- Explique sua relevância social, cultural ou informativa
- Apresente antecedentes, repercussão e possíveis desdobramentos
- Dialogue com a realidade local, regional ou nacional conforme o tema
Não resuma. Expanda com informação, contexto e leitura jornalística real.

Tom e estilo (OBRIGATÓRIO):
- Tom: informativo, claro e jornalístico, com narrativa fluida
- Linguagem: acessível ao público geral, sem simplificações excessivas
- Frases: variadas em tamanho, naturais, com ritmo humano
- Estilo: semelhante ao de portais de notícias brasileiros profissionais

Evite:
- grandiloquência constante
- adjetivos vagos e genéricos
- explicações óbvias ou didáticas demais

Sempre que fizer sentido:
- inclua contexto histórico ou social
- traga repercussão pública ou em redes sociais
- explique por que o fato importa para o leitor

Estrutura recomendada:
- Abertura jornalística direta, situando rapidamente o leitor
- Desenvolvimento com contexto, dados e narrativa progressiva
- Parágrafos que avancem a informação (sem circular no mesmo ponto)
- Coloque em negrito <b> </b> as palavras chaves`,
    seo_optimized: true,
    plagiarism_check: false,
    extract_images: true,
    avoid_logo: true,
    image_size: '1024x1024',
    image_instruction: 'Recrie esta imagem em estilo fotográfico realista, como se fosse uma nova foto tirada do mesmo acontecimento. - Preserve a identidade fiel da pessoa, objeto ou cenário principal (sem distorcer rostos, proporções ou detalhes essenciais). - Modifique a composição: use novo ângulo de câmera, pose diferente, variação de iluminação e fundo alternativo, mantendo o contexto da cena. - Evite que a posição e enquadramento sejam idênticos',
    image_provider: 'dalle'
};

const WhiteLabelContext = createContext<WhiteLabelContextType | undefined>(undefined);

export function WhiteLabelProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<WhiteLabelSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                setLoading(false);
                return;
            }

            // Bypass TypeScript errors for new tables
            const { data: memberData } = await (supabase as any)
                .from('organization_members')
                .select('organization_id')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (memberData) {
                const { data: wlData } = await (supabase as any)
                    .from('white_label_settings')
                    .select(`
            *,
            organizations (
              logo_url,
              favicon_url,
              primary_color
            )
          `)
                    .eq('organization_id', memberData.organization_id)
                    .maybeSingle();

                if (wlData) {
                    const org = Array.isArray(wlData.organizations) ? wlData.organizations[0] : wlData.organizations;
                    setSettings({
                        app_name: wlData.app_name || defaultSettings.app_name,
                        hero_title: wlData.hero_title || defaultSettings.hero_title,
                        hero_subtitle: wlData.hero_subtitle || defaultSettings.hero_subtitle,
                        support_email: wlData.support_email || null,
                        logo_url: org?.logo_url || null,
                        favicon_url: org?.favicon_url || null,
                        primary_color: org?.primary_color || defaultSettings.primary_color,
                        // AI Settings
                        ai_model: wlData.ai_model || defaultSettings.ai_model,
                        ai_provider: wlData.ai_provider || defaultSettings.ai_provider,
                        writing_tone: wlData.writing_tone || defaultSettings.writing_tone,
                        system_prompt: wlData.system_prompt || null,
                        seo_optimized: wlData.seo_optimized ?? defaultSettings.seo_optimized,
                        plagiarism_check: wlData.plagiarism_check ?? defaultSettings.plagiarism_check,
                        // Media Settings
                        extract_images: wlData.extract_images ?? defaultSettings.extract_images,
                        avoid_logo: wlData.avoid_logo ?? defaultSettings.avoid_logo,
                        image_size: wlData.image_size || defaultSettings.image_size,
                        image_instruction: wlData.image_instruction || defaultSettings.image_instruction,
                        image_provider: wlData.image_provider || defaultSettings.image_provider
                    });
                }
            }
        } catch (error) {
            console.error('Error loading white label settings:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        if (settings.primary_color) {
            const hex = settings.primary_color;
            // Basic HEX to HSL conversion for Tailwind (approximate)
            // Just applying the hex directly to --primary works if we change tailwind config, 
            // but tailwind is expecting space-separated HSL.
            // For now, let's just set the variable and see if it works.
            document.documentElement.style.setProperty('--primary-hex', hex);

            // To make it work with hsl(var(--primary)), we'd need conversion.
            // Simplified approach: just apply it as an inline style for now or use a dedicated variable.
            // But better: convert HEX to HSL string: "H S% L%"
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h = 0, s, l = (max + min) / 2;
            if (max === min) h = s = 0;
            else {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }
            const h_val = Math.round(h * 360);
            const s_val = Math.round(s * 100);
            const l_val = Math.round(l * 100);
            document.documentElement.style.setProperty('--primary', `${h_val} ${s_val}% ${l_val}%`);
        }
    }, [settings.primary_color]);
    useEffect(() => {
        if (settings.favicon_url) {
            let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.getElementsByTagName('head')[0].appendChild(link);
            }
            link.href = settings.favicon_url;
        }
    }, [settings.favicon_url]);

    useEffect(() => {
        if (settings.app_name) {
            document.title = settings.app_name;
        }
    }, [settings.app_name]);

    return (
        <WhiteLabelContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
            {children}
        </WhiteLabelContext.Provider>
    );
}

export function useWhiteLabel() {
    const context = useContext(WhiteLabelContext);
    if (context === undefined) {
        throw new Error('useWhiteLabel must be used within a WhiteLabelProvider');
    }
    return context;
}
