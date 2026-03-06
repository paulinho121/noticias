import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- CORE UTILS ---

async function fetchWithTimeout(url: string, options: any, timeout = 60000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

function getHighResImage(url: string | null): string | null {
  if (!url) return url;
  
  if (url.includes('oaidalleapiprodscus.blob.core.windows.net') || 
      url.includes('glbimg.com') || 
      url.includes('fbcdn.net') || 
      url.includes('googleusercontent.com') ||
      url.includes('wp-content')) {
    return url;
  }

  try {
    const urlObj = new URL(url);
    const resizeParams = ['w', 'h', 'resize', 'fit', 'quality', 'zoom', 'width', 'height'];
    resizeParams.forEach(p => { if (urlObj.searchParams.has(p)) urlObj.searchParams.delete(p); });
    let cleaned = urlObj.toString();
    cleaned = cleaned.replace(/-(\d+)x(\d+)(\.(?:jpg|jpeg|png|webp|gif))$/i, '$3');
    return cleaned;
  } catch (e) { return url; }
}

async function flipAndZoomImage(b64: string): Promise<string> {
  try {
    const { Image: ScriptImage } = await import("https://deno.land/x/imagescript@1.2.15/mod.ts");
    const binary = atob(b64);
    const pngBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) pngBytes[i] = binary.charCodeAt(i);
    const img = await ScriptImage.decode(pngBytes);
    img.mirror();
    const origW = img.width;
    const origH = img.height;
    const cropX = Math.floor(origW * 0.05);
    const cropY = Math.floor(origH * 0.05);
    const cropW = origW - cropX * 2;
    const cropH = origH - cropY * 2;
    img.crop(cropX, cropY, cropW, cropH);
    img.resize(origW, origH);
    const encoded = await img.encode(1);
    let resultB64 = '';
    const chunkSize = 8192;
    for (let i = 0; i < encoded.length; i += chunkSize) {
      resultB64 += String.fromCharCode(...encoded.subarray(i, i + chunkSize));
    }
    return btoa(resultB64);
  } catch (e: any) {
    return b64;
  }
}

class AIGateway {
  private supabase: any;
  private gems: string[];
  private openais: string[];

  constructor(supabase: any) {
    this.supabase = supabase;
    this.gems = ['gemini-2.5-flash'];
    this.openais = ['gpt-4o', 'gpt-4o-mini'];
  }

  async generateText(payload: { system: string, user: string, keys: { gemini?: string, openai?: string, hasUserOpenAI?: boolean, hasUserGemini?: boolean }, preferredModel?: string, logId?: string, feedItemId: string, preferredProvider?: string }) {
    const { system, user, keys, preferredModel, logId, feedItemId, preferredProvider } = payload;
    let content: string | null = null;
    let providerUsed = 'unknown';
    let lastError = "";

    let providers = ['gemini', 'openai'];
    if (preferredProvider === 'openai') { providers = ['openai']; } 
    else if (preferredProvider === 'gemini') { providers = ['gemini']; } 
    else if (!keys.hasUserOpenAI && (keys.gemini)) { providers = ['gemini']; }
    else if (preferredModel?.includes('gpt')) { providers = ['openai', 'gemini']; }
    else { providers = ['gemini', 'openai']; }

    for (const p of providers) {
      if (content) break;
      const key = p === 'gemini' ? keys.gemini : keys.openai;
      if (!key) continue;

      const models = p === 'gemini' ? this.gems : this.openais;
      let currentModels = (preferredModel && preferredModel.includes(p === 'gemini' ? 'gemini' : 'gpt')) ? [preferredModel, ...models] : models;

      if (p === 'gemini') {
        currentModels = currentModels.map(m => {
          if (m.includes('gemini-1.5') || m.includes('gemini-2.0') || m.includes('gemini-pro') || m === 'gemini-pro') return 'gemini-2.5-flash';
          return m;
        });
      }

      for (const model of [...new Set(currentModels)]) {
        try {
          const statusMsg = `IA: Tentando ${p === 'gemini' ? 'Google Gemini' : 'OpenAI'} (${model})...`;
          if (logId) await this.log(logId, statusMsg);
          
          let resp;
          if (p === 'gemini') {
            let apiVersion = (model.includes('exp') || model.includes('beta')) ? 'v1beta' : 'v1';
            const makeRequest = async (v: string) => {
              return await fetchWithTimeout(`https://generativelanguage.googleapis.com/${v}/models/${model}:generateContent?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: `${system}\n\n${user}` }] }],
                  generationConfig: { temperature: 0.4, maxOutputTokens: 8000 }
                })
              });
            };
            resp = await makeRequest(apiVersion);
            if (!resp.ok && apiVersion === 'v1beta') {
               const cloned = resp.clone();
               const errData = await cloned.json().catch(() => ({}));
               if (errData.error?.message?.includes('not found') || resp.status === 404) {
                 resp = await makeRequest('v1');
               }
            }
          } else {
            resp = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model,
                messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
                temperature: 0.4,
                response_format: { type: "json_object" }
              })
            });
          }

          const data = await resp.json();
          if (data.error) {
            const errorMsg = data.error.message || JSON.stringify(data.error);
            if (logId) await this.log(logId, `IA: Erro em ${p} (${model}) - ${errorMsg}`);
            lastError = `${p} (${model}): ${errorMsg}`;
            continue;
          }

          content = p === 'gemini' ? data.candidates?.[0]?.content?.parts?.[0]?.text : data.choices?.[0]?.message?.content;
          if (content) {
            providerUsed = `${p}:${model}`;
            break;
          }
        } catch (e: any) { 
          if (logId) await this.log(logId, `IA: Falha de conexão com ${p} (${model})`);
          lastError = `${p} (${model}): ${e.message}`;
        }
      }
    }

    if (!content) throw new Error(`Falha na IA. Último erro: ${lastError || "Nenhum provedor respondeu"}. Verifique suas chaves de API.`);
    return { content, provider: providerUsed };
  }

  async analyzeImageWithVision(imageUrl: string, articleContext: string, geminiKey: string): Promise<string | null> {
    try {
      const imgResp = await fetchWithTimeout(imageUrl, {}, 20000);
      if (!imgResp.ok) return null;
      const imgBuffer = await imgResp.arrayBuffer();
      const b64Image = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));

      const body = {
        contents: [{
          parts: [
            { text: `Analyze this image for DALL-E 3 prompt. Context: ${articleContext}` },
            { inline_data: { mime_type: 'image/jpeg', data: b64Image } }
          ]
        }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
      };

      const resp = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, 30000);
      const data = await resp.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    } catch (e) { return null; }
  }

  async generateImage(payload: { prompt: string, sourceImageUrl?: string, sourceImageB64?: string, articleContext?: string, keys: { gemini?: string, openai?: string, hasUserOpenAI?: boolean, hasUserGemini?: boolean }, logId?: string, feedItemId: string, orgSettings?: any, imageEngine?: string, enhanceScrapedImage?: boolean }) {
    const { prompt, sourceImageUrl, sourceImageB64, articleContext, keys, logId, feedItemId, orgSettings, imageEngine, enhanceScrapedImage } = payload;
    let imgProviders: string[] = [];
    const effectiveProvider = imageEngine || orgSettings?.image_provider;

    if (effectiveProvider === 'scraped') {
      if (enhanceScrapedImage && sourceImageUrl) {
        try {
          const imgResp = await fetchWithTimeout(sourceImageUrl, {}, 20000);
          if (imgResp.ok) {
            const buf = await imgResp.arrayBuffer();
            const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
            return await this.uploadImage(b64, feedItemId, 'enhanced');
          }
        } catch (e) {}
      }
      return null;
    } else if (effectiveProvider === 'google_gemini') { imgProviders = ['gemini']; } 
    else if (effectiveProvider === 'dalle') { imgProviders = ['openai']; } 
    else {
      if (keys.gemini) imgProviders.push('gemini');
      if (keys.openai) imgProviders.push('openai');
    }

    let finalPrompt = prompt;
    if (sourceImageUrl && keys.gemini) {
      const visionPrompt = await this.analyzeImageWithVision(sourceImageUrl, articleContext || prompt, keys.gemini);
      if (visionPrompt) finalPrompt = visionPrompt;
    }

    for (const p of imgProviders) {
      const key = (p === 'gemini') ? keys.gemini : keys.openai;
      if (!key) continue;

      try {
        if (p === 'gemini') {
          const imageModels = ['imagen-4.0-generate-001', 'imagen-3.0-generate-001'];
          for (const m of imageModels) {
            const apiVersion = (m.includes('exp') || m.includes('beta')) ? 'v1beta' : 'v1';
            const resp = await fetchWithTimeout(`https://generativelanguage.googleapis.com/${apiVersion}/models/${m}:predict?key=${key}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ instances: [{ prompt: finalPrompt }], parameters: { sampleCount: 1, aspectRatio: "16:9" } })
            });
            const data = await resp.json();
            if (data.predictions?.[0]?.bytesBase64Encoded) return await this.uploadImage(data.predictions[0].bytesBase64Encoded, feedItemId, 'imagen');
          }
        } else {
          const genResp = await fetchWithTimeout('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'dall-e-3', prompt: finalPrompt, n: 1, size: orgSettings?.image_size || '1024x1024' })
          }, 120000);
          const genData = await genResp.json();
          if (genData.data?.[0]?.b64_json) return await this.uploadImage(genData.data[0].b64_json, feedItemId, 'dalle');
        }
      } catch (e) {}
    }
    return null;
  }

  private async uploadImage(b64: string, feedItemId: string, prefix: string) {
    const processedB64 = await flipAndZoomImage(b64);
    const fileName = `${prefix}_${feedItemId}_${Date.now()}.png`;
    const binary = atob(processedB64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const { error } = await this.supabase.storage.from('news-images').upload(fileName, bytes, { contentType: 'image/png', upsert: true });
    if (error) throw error;
    const { data } = this.supabase.storage.from('news-images').getPublicUrl(fileName);
    return data.publicUrl;
  }

  private async log(id: string, message: string) {
    await this.supabase.from('logs').update({ message }).eq('id', id);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('MASTER_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const ai = new AIGateway(supabase);
  let feedItemId: string | null = null;
  try {
    const authHeader = req.headers.get('Authorization');
    const body = await req.json();
    feedItemId = body.feedItemId;
    if (!feedItemId) throw new Error("feedItemId is required");
    const { data: item, error: itemErr } = await supabase.from('feed_items').select('*, feeds(*)').eq('id', feedItemId).single();
    if (itemErr || !item) throw new Error(`Item não encontrado`);
    await supabase.from('feed_items').update({ status: 'processing' }).eq('id', feedItemId);
    const { data: initialLog } = await supabase.from('logs').insert({ feed_id: item.feed_id, user_id: item.user_id, organization_id: item.organization_id, feed_item_id: feedItemId, status: 'processing', step: 'init', message: 'IA: Iniciando...' }).select().single();
    const logId = initialLog?.id;
    const { data: creds } = await supabase.from('platform_settings').select('*').or(`user_id.eq.${item.user_id},organization_id.eq.${item.organization_id}`);
    const getCred = (pid: string) => creds?.find((c: any) => c.platform_id === pid)?.credentials?.api_key || null;
    const keys = { gemini: getCred('google_gemini') || Deno.env.get('GEMINI_API_KEY'), openai: getCred('openai') || Deno.env.get('OPENAI_API_KEY'), hasUserOpenAI: !!getCred('openai'), hasUserGemini: !!getCred('google_gemini') };
    const { data: wl } = await supabase.from('white_label_settings').select('*').eq('organization_id', item.organization_id).maybeSingle();

    const { content: aiText, provider } = await ai.generateText({
      system: `Rewrite this as news article. Use HTML. Force Sentence case. Provider instructions: ${wl?.system_prompt || ''}`,
      user: `ORIGINAL: ${item.source_title}\n\n${item.source_content?.substring(0, 10000)}`,
      keys, preferredModel: wl?.ai_model, logId, feedItemId
    });

    let rewritten = JSON.parse(aiText.replace(/```json|```/g, '').trim());
    let newImageUrl = await ai.generateImage({ prompt: rewritten.visual_prompt, sourceImageUrl: item.source_image, keys, logId, feedItemId, orgSettings: wl });

    await supabase.from('feed_items').update({
      rewritten_title: rewritten.title,
      rewritten_content: rewritten.content,
      rewritten_image: newImageUrl || item.source_image,
      status: item.feeds.auto_publish ? 'ready' : 'success',
      processed_at: new Date().toISOString()
    }).eq('id', feedItemId);

    if (logId) await supabase.from('logs').update({ status: 'success', message: `IA Concluída via ${provider}` }).eq('id', logId);
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    if (feedItemId) await supabase.from('feed_items').update({ status: 'error', error_message: e.message }).eq('id', feedItemId);
    return new Response(JSON.stringify({ success: false, error: e.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
