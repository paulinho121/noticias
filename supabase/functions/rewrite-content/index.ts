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
  
  // Anti-Bloqueio: Se for link expirado ou URL assinada que PRECISA de parâmetros, NÃO TOCAR.
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

// --- IMAGE TRANSFORM UTILS (Flip Horizontal + Zoom 10%) ---
// Uses imagescript via deno.land (pure TS, no native bindings)

async function flipAndZoomImage(b64: string): Promise<string> {
  try {
    // Dynamically import imagescript to catch module load errors
    const { Image: ScriptImage } = await import("https://deno.land/x/imagescript@1.2.15/mod.ts");
    
    // 1. Decode b64 -> raw bytes
    const binary = atob(b64);
    const pngBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) pngBytes[i] = binary.charCodeAt(i);

    // 2. Decode image with imagescript
    const img = await ScriptImage.decode(pngBytes);
    console.log(`[flipAndZoom] Imagem carregada: ${img.width}x${img.height}`);

    // 3. Mirror horizontally (.mirror() = left-right flip in imagescript)
    img.mirror();

    // 4. Zoom 10%: crop 5% each side, then resize back to original dimensions
    const origW = img.width;
    const origH = img.height;
    const cropX = Math.floor(origW * 0.05);
    const cropY = Math.floor(origH * 0.05);
    const cropW = origW - cropX * 2;
    const cropH = origH - cropY * 2;

    img.crop(cropX, cropY, cropW, cropH);
    img.resize(origW, origH);

    // 5. Re-encode to PNG -> base64
    const encoded = await img.encode(1); // 1 = PNG
    let resultB64 = '';
    const chunkSize = 8192;
    for (let i = 0; i < encoded.length; i += chunkSize) {
      resultB64 += String.fromCharCode(...encoded.subarray(i, i + chunkSize));
    }
    console.log('[flipAndZoom] ✅ Imagem espelhada e com zoom aplicado com sucesso!');
    return btoa(resultB64);
  } catch (e: any) {
    console.error('[flipAndZoom] ❌ Falhou:', e.message);
    return b64; // Fallback seguro - retorna original
  }
}


// --- AI GATEWAY CLASS ---

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

    // Determine priority and restriction
    let providers = ['gemini', 'openai'];
    
    // 1. Se o provedor preferido for explicitamente setado, USAR APENAS ELE.
    if (preferredProvider === 'openai') {
      providers = ['openai'];
    } else if (preferredProvider === 'gemini') {
      providers = ['gemini'];
    } 
    // 2. Se o usuário NÃO tem chave OpenAI própria, priorizamos Gemini e evitamos OpenAI do sistema como fallback automático
    // a menos que Gemini falhe e não tenhamos outra opção.
    else if (!keys.hasUserOpenAI && (keys.gemini)) {
      providers = ['gemini'];
    }
    // 3. Se o modelo preferido for GPT, priorizamos OpenAI
    else if (preferredModel?.includes('gpt')) {
      providers = ['openai', 'gemini'];
    }
    // 4. Fallback padrão: Gemini primeiro, OpenAI depois
    else {
      // Prioridade absoluta para Gemini se não houver preferência, para economizar Master Key OpenAI
      providers = ['gemini', 'openai'];
    }

    for (const p of providers) {
      if (content) break;
      const key = p === 'gemini' ? keys.gemini : keys.openai;
      if (!key) continue;

      const models = p === 'gemini' ? this.gems : this.openais;
      let currentModels = (preferredModel && preferredModel.includes(p === 'gemini' ? 'gemini' : 'gpt')) 
        ? [preferredModel, ...models] 
        : models;

      // Force upgrade of legacy/problematic models for Gemini
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
          console.log(statusMsg);
          
          let resp;
          if (p === 'gemini') {
            // Usar v1 para modelos estáveis e v1beta apenas se for explicitamente experimental
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
            
            // Auto-fallback if v1beta fails with Not Found (404/400)
            if (!resp.ok && apiVersion === 'v1beta') {
               const cloned = resp.clone();
               const errData = await cloned.json().catch(() => ({}));
               if (errData.error?.message?.includes('not found') || resp.status === 404) {
                 console.log(`[AIGateway] Fallback to v1 for model ${model}`);
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
            // Don't overwrite the main log if it's an error, insert a new diagnostic log instead if possible
            // but for now, we'll update it so the user sees WHY it failed
            if (logId) await this.log(logId, `IA: Erro em ${p} (${model}) - ${errorMsg}`);
            console.error(`Error in ${p} (${model}):`, errorMsg);
            lastError = `${p} (${model}): ${errorMsg}`;
            continue;
          }

          content = p === 'gemini' 
            ? data.candidates?.[0]?.content?.parts?.[0]?.text 
            : data.choices?.[0]?.message?.content;

          if (content) {
            providerUsed = `${p}:${model}`;
            break;
          }
        } catch (e: any) { 
          const msg = `IA: Falha de conexão com ${p} (${model}) - ${e.message}`;
          console.error(msg, e); 
          if (logId) await this.log(logId, msg);
          lastError = `${p} (${model}): ${e.message}`;
        }
      }
    }

    if (!content) throw new Error(`Falha na IA. Último erro: ${lastError || "Nenhum provedor respondeu"}. Verifique suas chaves de API.`);
    return { content, provider: providerUsed };
  }

  // Analyze a source image URL using Gemini Vision and return a detailed photography prompt
  async analyzeImageWithVision(imageUrl: string, articleContext: string, geminiKey: string): Promise<string | null> {
    try {
      console.log(`[Vision] Fetching source image: ${imageUrl}`);
      const imgResp = await fetchWithTimeout(imageUrl, {}, 20000);
      if (!imgResp.ok) {
        console.error(`[Vision] Could not fetch image: ${imgResp.status}`);
        return null;
      }
      const imgBuffer = await imgResp.arrayBuffer();
      const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
      const mimeType = contentType.split(';')[0].trim();
      const b64Image = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));

      const visionPrompt = `Você é um diretor de fotografia. Faça uma Análise Detalhada (em inglês) IMPECÁVEL desta imagem para ser usada como PROMPT no modelo DALL-E 3 ou Imagen.
Objetivo: Recriar esta exata imagem de forma Hiper-Realista, mantendo as características essenciais para o leitor, mas com uma "cara" nova para fugir de direitos autorais.

Contexto da notícia: ${articleContext}

Regras ABSOLUTAMENTE CRÍTICAS para o seu prompt em inglês:
1. DESCREVA AS PESSOAS: Descreva os rostos, traços faciais, etnia aproximada, cor dos olhos/cabelo, emoção (chorando, sorrindo, sério) e a roupa exata com cores.
2. PRESERVE A COMPOSIÇÃO: Se é um abraço, detalhe como os braços estão. Se estão sentados na areia (como a imagem 1), descreva isso. Jamais mude a pose base.
3. ADICIONE "REMIX" VISUAL (O SEGREDO): Ao final do prompt, acrescente estilos de câmera e iluminação premium que mascaram a foto original. Exemplo: "shot on 35mm lens, f/1.8 depth of field, dramatic cinematic lighting, ultra-detailed textures, 8k resolution, photorealistic masterpiece, slightly different background tones".
4. Máximo de 200 palavras. Retorne APENAS o prompt em inglês, pronto para copia e cola no motor de imagem. Sem conversas, introduções ou notas de rodapé.`;

      const body = {
        contents: [{
          parts: [
            { text: visionPrompt },
            { inline_data: { mime_type: mimeType, data: b64Image } }
          ]
        }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
      };

      const resp = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
        30000
      );
      const data = await resp.json();
      const visionResult = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (visionResult) {
        console.log(`[Vision] Generated prompt: ${visionResult.substring(0, 100)}...`);
        return visionResult;
      }
      console.error('[Vision] Empty response from Gemini Vision:', JSON.stringify(data).substring(0, 300));
      return null;
    } catch (e: any) {
      console.error('[Vision] Analysis failed:', e.message);
      return null;
    }
  }

  async generateImage(payload: { prompt: string, sourceImageUrl?: string, sourceImageB64?: string, articleContext?: string, keys: { gemini?: string, openai?: string, hasUserOpenAI?: boolean, hasUserGemini?: boolean }, logId?: string, feedItemId: string, orgSettings?: any, imageEngine?: string, enhanceScrapedImage?: boolean }) {
    const { prompt, sourceImageUrl, sourceImageB64, articleContext, keys, logId, feedItemId, orgSettings, imageEngine, enhanceScrapedImage } = payload;
    
    // Priority based on Feed Image Engine or Organization Settings
    let imgProviders: string[] = [];
    const effectiveProvider = imageEngine || orgSettings?.image_provider;

    if (effectiveProvider === 'scraped') {
      if (enhanceScrapedImage && sourceImageUrl) {
        if (logId) await this.log(logId, `IA: Melhorando imagem original (Anti-Copyright & Zoom)...`);
        try {
          const imgResp = await fetchWithTimeout(sourceImageUrl, {}, 20000);
          if (imgResp.ok) {
            const imgBuffer = await imgResp.arrayBuffer();
            const b64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
            return await this.uploadImage(b64, feedItemId, 'enhanced');
          }
        } catch (e: any) {
          console.error('[EnhanceScraped] Failed:', e.message);
          if (logId) await this.log(logId, `IA: Falha ao melhorar imagem original: ${e.message}`);
        }
      }
      return null; // Don't generate anything, use original image
    } else if (effectiveProvider === 'google_gemini') {
      imgProviders = ['gemini'];                           // Imagen puro
    } else if (effectiveProvider === 'dalle') {
      imgProviders = ['openai'];                           // DALL-E 3 puro
    } else if (effectiveProvider === 'gemini_2_5' || effectiveProvider === 'nano_banana') {
      imgProviders = ['nano_banana', 'openai', 'gemini'];  // Gemini 2.5/2.5 Flash Image > DALL-E > Imagen
    } else {
      // --- PADRÃO INTELIGENTE: usar o melhor motor disponível automaticamente ---
      if (keys.gemini) imgProviders.push('nano_banana');
      if (keys.openai) imgProviders.push('openai');
      if (keys.gemini) imgProviders.push('gemini');
    }

    // --- GEMINI VISION: Analyze source image to build a rich, accurate prompt ---
    let finalPrompt = prompt;
    if (sourceImageUrl && keys.gemini) {
      if (logId) await this.log(logId, `IA: Analisando imagem original com Gemini Vision...`);
      const visionPrompt = await this.analyzeImageWithVision(sourceImageUrl, articleContext || prompt, keys.gemini);
      if (visionPrompt) {
        finalPrompt = visionPrompt;
        if (logId) await this.log(logId, `IA: Prompt visual gerado pela Vision ✓`);
      } else {
        if (logId) await this.log(logId, `IA: Vision falhou, usando prompt padrão.`);
      }
    }

    for (const p of imgProviders) {
      const key = (p === 'gemini' || p === 'nano_banana') ? keys.gemini : keys.openai;
      if (!key) {
        console.warn(`[AIGateway] Descartando ${p} — Chave de API ausente.`);
        continue;
      }

      try {
        if (p === 'nano_banana') {
          if (logId) await this.log(logId, `IA: Gerando imagem avançada via Nano Banana (Gemini 2.5 Flash Image)...`);
          // Novo modelo oficial para geração/edição de imagens com system instruction
          const model = "gemini-2.5-flash-image";

          // System instruction padrão de recriação fotográfica fiel (baseada na API atualizada)
          const systemInstruction = [
            {
              text: `Recrie esta imagem em estilo fotográfico realista, como se fosse uma nova foto tirada do mesmo acontecimento. - Preserve a identidade fiel da pessoa, objeto ou cenário principal (sem distorcer rostos, proporções ou detalhes essenciais). - Modifique a composição: use novo ângulo de câmera, pose diferente, variação de iluminação e fundo alternativo, mantendo o contexto da cena. - Evite que a posição e enquadramento sejam idênticos`
            }
          ];

          try {
            console.log(`Trying Nano Banana (gemini-2.5-flash-image) with prompt: ${finalPrompt.substring(0, 80)}...`);
            
            const parts: any[] = [];
            // Priority: inline b64 from user upload > URL from feed
            if (sourceImageB64) {
                console.log(`[NanoBanana] Editando imagem enviada pelo usuário com prompt personalizado`);
                parts.push({
                   inlineData: {
                      mimeType: 'image/jpeg',
                      data: sourceImageB64
                   }
                });
                // Instrução direta de edição — não apenas referência
                const editInstruction = finalPrompt
                  ? `Edit this image directly. Apply these exact changes: ${finalPrompt}. Keep everything else in the image the same. Maintain the same scene, people, and composition unless explicitly told to change them.`
                  : `Enhance this image: improve lighting, sharpness and colors. Make it look photorealistic and professional. Keep the same scene and composition.`;
                parts.push({ text: editInstruction });
            } else if (sourceImageUrl) {
                console.log(`[NanoBanana] Buscando imagem original para remix: ${sourceImageUrl}`);
                const imgResp = await fetchWithTimeout(sourceImageUrl, {}, 20000);
                if (imgResp.ok) {
                   const imgBuffer = await imgResp.arrayBuffer();
                   const mime = imgResp.headers.get('content-type') || 'image/jpeg';
                   const b64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
                   
                   parts.push({
                      inlineData: {
                         mimeType: mime,
                         data: b64
                      }
                   });
                   // Texto de entrada: contexto adicional + prompt customizado
                   const autoInstruction = finalPrompt
                     ? `Additional instructions: ${finalPrompt}`
                     : `Recreate this image as a new journalistic photo of the same event.`;
                   parts.push({ text: autoInstruction });
                } else {
                   parts.push({ text: finalPrompt });
                }
            } else {
                parts.push({ text: finalPrompt });
            }

            const apiVersion = (model.includes('exp') || model.includes('beta')) ? 'v1beta' : 'v1';
            const resp = await fetchWithTimeout(`https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${key}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                system_instruction: { parts: systemInstruction },
                contents: [{ role: 'user', parts: parts }],
                generationConfig: {
                  responseModalities: ["IMAGE", "TEXT"],
                }
              })
            });
            const data = await resp.json();
            
            // Extract the image from the REST response
            let finalB64 = null;
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
               for (const part of data.candidates[0].content.parts) {
                 if (part.inlineData && part.inlineData.data) {
                   finalB64 = part.inlineData.data;
                   break;
                 } else if (part.text) {
                   console.log(`[NanoBanana] Text response: ${part.text.substring(0, 100)}`);
                 }
               }
            }
            
            if (finalB64) {
               console.log("Image generated successfully with Nano Banana (gemini-2.5-flash-image)");
               return await this.uploadImage(finalB64, feedItemId, 'nano_banana');
            } else {
               const errMsg = data.error?.message || JSON.stringify(data).substring(0, 200);
               console.error(`Nano Banana failed: ${errMsg}`);
               if (logId) await this.log(logId, `IA: Erro Nano Banana - ${errMsg.substring(0, 120)}`);
            }
          } catch (e: any) {
             console.error(`Failed with Nano Banana`, e.message);
             if (logId) await this.log(logId, `IA: Falha Nano Banana - ${e.message}`);
          }
        } else if (p === 'gemini') {
          if (logId) await this.log(logId, `IA: Gerando imagem via Imagen 4...`);
          
          // Modelos Imagen confirmados disponíveis via v1beta (conforme available_models.json)
          const imageModels = [
            'imagen-4.0-generate-001',      // Imagen 4 - estável
            'imagen-4.0-fast-generate-001', // Imagen 4 Fast - mais rápido
            'imagen-3.0-generate-001',      // Imagen 3 - fallback
          ];
          let finalB64 = null;

          for (const m of imageModels) {
            try {
              console.log(`Trying Imagen model: ${m} with prompt: ${finalPrompt.substring(0, 80)}...`);
              const apiVersion = (m.includes('exp') || m.includes('beta')) ? 'v1beta' : 'v1';
              const resp = await fetchWithTimeout(`https://generativelanguage.googleapis.com/${apiVersion}/models/${m}:predict?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  instances: [{ prompt: `${finalPrompt} --photorealistic, 8k, cinematic lighting` }], 
                  parameters: { sampleCount: 1, aspectRatio: "16:9" } 
                })
              });
              const data = await resp.json();
              if (data.predictions?.[0]?.bytesBase64Encoded) {
                finalB64 = data.predictions[0].bytesBase64Encoded;
                console.log(`Image generated successfully with ${m}`);
                break;
              }
              const errMsg = data.error?.message || JSON.stringify(data).substring(0, 200);
              console.error(`Model ${m} failed: ${errMsg}`);
            } catch (e: any) { console.error(`Failed with image model ${m}`, e.message); }
          }
          
          if (finalB64) return await this.uploadImage(finalB64, feedItemId, 'imagen');
          if (logId) await this.log(logId, `IA: Imagen indisponível (sem permissão ou cota esgotada). Continuando sem imagem gerada.`);
        } else {
          if (logId) await this.log(logId, `IA: Gerando imagem via OpenAI (gpt-image-1)...`);

          let b64 = null;

          // Prompt padrão de recriação fotográfica fiel (mesmo do script Python)
          const editPrompt = `Recrie esta imagem em estilo fotográfico realista, como se fosse uma nova foto tirada do mesmo acontecimento. Preserve a identidade fiel da pessoa, objeto ou cenário principal. Modifique a composição: use novo ângulo de câmera, pose diferente, variação de iluminação e fundo alternativo. Evite que a posição e enquadramento sejam idênticos.${finalPrompt ? ' ' + finalPrompt : ''}`;

          // --- CAMINHO 1: Edição com imagem de referência via /v1/images/edits (gpt-image-1) ---
          if (sourceImageB64 || sourceImageUrl) {
            try {
              let imageBytes: Uint8Array | null = null;
              let imageMime = 'image/jpeg';

              if (sourceImageB64) {
                // Imagem enviada pelo usuário (upload direto)
                console.log(`[OpenAI Edit] Usando imagem enviada pelo usuário como referência`);
                const binary = atob(sourceImageB64);
                imageBytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) imageBytes[i] = binary.charCodeAt(i);
                imageMime = 'image/jpeg';
              } else if (sourceImageUrl) {
                // Imagem da notícia (URL do feed)
                console.log(`[OpenAI Edit] Buscando imagem do feed para edição: ${sourceImageUrl}`);
                const imgResp = await fetchWithTimeout(sourceImageUrl, {}, 20000);
                if (imgResp.ok) {
                  const buf = await imgResp.arrayBuffer();
                  imageBytes = new Uint8Array(buf);
                  imageMime = imgResp.headers.get('content-type') || 'image/jpeg';
                }
              }

              if (imageBytes) {
                // Montar multipart/form-data (exigido pelo endpoint /edits)
                const formData = new FormData();
                const blob = new Blob([imageBytes.buffer as ArrayBuffer], { type: imageMime });
                formData.append('image', blob, 'source.png');
                formData.append('prompt', editPrompt);
                formData.append('model', 'gpt-image-1');
                formData.append('size', orgSettings?.image_size || '1024x1024');

                const editResp = await fetchWithTimeout('https://api.openai.com/v1/images/edits', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${key}` },
                  body: formData
                }, 120000);

                const editData = await editResp.json();
                if (editData.error) {
                  const errMsg = editData.error.message || JSON.stringify(editData.error);
                  console.error(`[OpenAI Edit] Erro gpt-image-1 edit: ${errMsg}`);
                  if (logId) await this.log(logId, `IA: Erro gpt-image-1 edit - ${errMsg.substring(0, 120)}`);
                } else {
                  b64 = editData.data?.[0]?.b64_json;
                  if (b64) console.log('[OpenAI Edit] ✅ Imagem editada com sucesso via gpt-image-1');
                }
              }
            } catch (e: any) {
              console.error('[OpenAI Edit] Falhou:', e.message);
              if (logId) await this.log(logId, `IA: Falha gpt-image-1 edit - ${e.message}`);
            }
          }

          // --- CAMINHO 2: Geração pura sem imagem (fallback ou sem referência) ---
          if (!b64) {
            try {
              if (logId) await this.log(logId, `IA: Gerando imagem via gpt-image-1 (geração pura)...`);
              const genResp = await fetchWithTimeout('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  model: 'gpt-image-1',
                  prompt: finalPrompt,
                  n: 1,
                  size: orgSettings?.image_size || '1024x1024',
                  quality: 'high',
                })
              }, 120000);
              const genData = await genResp.json();
              if (genData.error) {
                const errMsg = genData.error.message || JSON.stringify(genData.error);
                console.error(`[OpenAI Gen] Erro gpt-image-1 generation: ${errMsg}`);
                if (logId) await this.log(logId, `IA: Erro gpt-image-1 generation - ${errMsg.substring(0, 120)}`);
                continue;
              }
              b64 = genData.data?.[0]?.b64_json;
              if (b64) console.log('[OpenAI Gen] ✅ Imagem gerada com sucesso via gpt-image-1');
            } catch (e: any) {
              console.error('[OpenAI Gen] Falhou:', e.message);
              if (logId) await this.log(logId, `IA: Falha gpt-image-1 generation - ${e.message}`);
              continue;
            }
          }

          if (b64) return await this.uploadImage(b64, feedItemId, 'dalle');
        }
      } catch (e: any) {
        console.error(`${p} Image Gen failed`, e);
        if (logId) await this.log(logId, `IA: Falha na conexão de imagem (${p})`);
      }
    }

    return null;
  }

  private async uploadImage(b64: string, feedItemId: string, prefix: string) {
    // Aplicar espelhamento horizontal + zoom 10% antes de salvar (anti-copyright)
    console.log(`[uploadImage] Aplicando flip + zoom na imagem (${prefix})...`);
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

// --- MAIN SERVE ---

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('MASTER_KEY')!;
  
  if (!supabaseUrl) throw new Error("SUPABASE_URL não configurada no motor de reescrita.");
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  const ai = new AIGateway(supabase);

  let feedItemId: string | null = null;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Acesso negado: Token de autorização não encontrado.");
    
    const body = await req.json();
    feedItemId = body.feedItemId;
    const customImagePrompt: string | null = body.customImagePrompt || null;
    const customSourceImageB64: string | null = body.customSourceImageB64 || null;
    const onlyImage: boolean = !!body.onlyImage;
    if (!feedItemId) throw new Error("feedItemId is required");

    // 1. Fetch Item and Verify Ownership (IDOR Protection)
    const { data: item, error: itemErr } = await supabase.from('feed_items').select('*, feeds(*)').eq('id', feedItemId).single();
    if (itemErr || !item) throw new Error(`Item não encontrado: ${itemErr?.message}`);

    // VALIDAR TOKEN E PROPRIEDADE
    const userClient = createClient(supabaseUrl, authHeader.replace('Bearer ', ''));
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    
    let isMaster = false;
    
    if (authError || !user) {
        // Se for uma chamada do sistema (Ex: cron worker), podemos permitir se o token for a service key
        // Mas para chamadas via browser/UI, validamos o usuário
        if (authHeader !== `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`) {
            throw new Error("Sessão inválida ou expirada. Por favor, faça login novamente.");
        }
        isMaster = true; // Chamada de sistema é tratada como master para fins de bypass de billing (ou podíamos checar créditos da org)
    } else {
        // Verificar se o usuário pertence à mesma organização do item
        const { data: orgMember } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', user.id)
            .eq('organization_id', item.organization_id)
            .maybeSingle();

        // Verificar se é Master Admin (Hardcoded whitelist)
        isMaster = [
            'paulofernandoautomacao@gmail.com',
            'jotavmkt@gmail.com',
            'labwpplus@gmail.com',
            'labnews.pro@gmail.com',
            'admin@labnews.pro'
        ].includes(user.email || '');

        if (!orgMember && !isMaster) {
            throw new Error("Acesso negado: Você não tem permissão para editar este conteúdo.");
        }
    }

    await supabase.from('feed_items').update({ status: 'processing' }).eq('id', feedItemId);

    const { data: initialLog } = await supabase.from('logs').insert({
      feed_id: item.feed_id,
      user_id: item.user_id,
      organization_id: item.organization_id,
      feed_item_id: feedItemId,
      status: 'processing',
      step: 'init',
      message: 'IA: Iniciando pipeline autônomo...'
    }).select().single();

    const logId = initialLog?.id;

    // 2. Resolve Credentials
    const { data: creds } = await supabase.from('platform_settings').select('*')
      .or(`user_id.eq.${item.user_id},organization_id.eq.${item.organization_id}`);
    
    const getCred = (pid: string) => {
      // Find all matching credentials and pick the first one which is actually valid
      const matches = creds?.filter((c: any) => c.platform_id === pid && c.credentials?.api_key?.trim().length > 10);
      return matches?.[0]?.credentials?.api_key?.trim() || null;
    };

    const userGemini = getCred('google_gemini') || getCred('gemini') || getCred('google') || getCred('nano_banana');
    const userOpenAI = getCred('openai') || getCred('openai_images');
    const systemGemini = Deno.env.get('GEMINI_API_KEY');
    const systemOpenAI = Deno.env.get('OPENAI_API_KEY');

    const keys = {
      gemini: userGemini || systemGemini,
      openai: userOpenAI || systemOpenAI,
      hasUserOpenAI: !!userOpenAI,
      hasUserGemini: !!userGemini
    };

    // 3. Billing & Access Control (Cost Isolation)
    const { data: org } = await supabase.from('organizations').select('*').eq('id', item.organization_id).single();
    const isFreeTrial = org?.subscription_plan === 'free_trial' || !org?.subscription_plan;
    const trialExpired = org?.trial_ends_at && new Date(org.trial_ends_at) < new Date();
    const hasOwnKeys = !!userGemini || !!userOpenAI;
    
    // Se o trial expirou E o usuário não tem chaves próprias, bloqueamos o uso das chaves do sistema
    if (isFreeTrial && trialExpired && !hasOwnKeys && !isMaster) {
        const errorMsg = "Seu período de teste expirou. Para continuar usando o motor do sistema, assine um plano. Ou adicione suas próprias chaves de API (Google Gemini/OpenAI) nas configurações.";
        if (logId) await supabase.from('logs').update({ status: 'error', message: `Acesso Bloqueado: ${errorMsg}` }).eq('id', logId);
        throw new Error(errorMsg);
    }

    const { data: wl } = await supabase.from('white_label_settings').select('*').eq('organization_id', item.organization_id).maybeSingle();

    // ----------- MODO APENAS IMAGEM -----------
    // Quando onlyImage=true, pulamos toda a reescrita de texto e vamos direto para geração de imagem
    if (onlyImage) {
      if (logId) await supabase.from('logs').update({ message: 'IA: Modo Imagem — gerando nova foto...' }).eq('id', logId);
      const sourceImageUrl = customSourceImageB64 ? null : (item.source_image ? getHighResImage(item.source_image) : null);
      const articleContext = `${item.rewritten_title || item.source_title}. ${item.meta_description || ''}`;
      const fallbackPrompt = customImagePrompt || item.visual_prompt
        || `Photorealistic news photo about: ${item.rewritten_title || item.source_title}. Cinematic composition, 8k, professional photojournalism.`;

      const newImageUrl = await ai.generateImage({
        prompt: fallbackPrompt,
        sourceImageUrl: sourceImageUrl || undefined,
        sourceImageB64: customSourceImageB64 || undefined,
        articleContext,
        keys,
        logId,
        feedItemId,
        orgSettings: wl,
        imageEngine: item.feeds?.image_engine,
        enhanceScrapedImage: item.feeds?.enhance_scraped_image
      });

      // Salva apenas a imagem gerada
      if (newImageUrl) {
        await supabase.from('feed_items').update({
          rewritten_image: newImageUrl,
          status: item.status === 'processing' ? (item.feeds?.auto_publish ? 'ready' : 'success') : item.status
        }).eq('id', feedItemId);
        if (logId) await supabase.from('logs').update({ status: 'success', step: 'complete', message: 'IA: Imagem gerada com sucesso!' }).eq('id', logId);
        return new Response(JSON.stringify({ success: true, rewritten_image: newImageUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } else {
        // Falhou — restaura status e retorna erro
        await supabase.from('feed_items').update({ status: item.status === 'processing' ? 'success' : item.status }).eq('id', feedItemId);
        if (logId) await supabase.from('logs').update({ status: 'error', step: 'image', message: 'IA: Falha ao gerar imagem.' }).eq('id', logId);
        return new Response(JSON.stringify({ success: false, error: 'Geração de imagem falhou. Verifique as chaves de API.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }
    // ------------------------------------------

    // 3. Text Generation
    const toneInstructions: any = {
      journalistic: 'Tom profissional, fatos, pirâmide invertida.',
      humanize: 'Estilo natural, fluido, variado, tom amigável.',
      viral: 'Hooks fortes, curto, focado em compartilhamento.',
    };

    const basePrompt = (wl?.prompt_mode === 'custom' && wl?.system_prompt)
      ? wl.system_prompt
      : 'Você é um Editor-Chefe e Especialista em SEO de nível sênior, analítico e focado em retenção de audiência.';

    const systemPrompt = `${basePrompt} 
      TONALIDADE: ${toneInstructions[item.feeds.writing_tone || 'journalistic']}
      ${item.feeds.custom_prompt ? `DIRETRIZES ADICIONAIS: ${item.feeds.custom_prompt}` : ''}
      ${item.feeds.generate_highlights ? `\nDESTAQUES (TL;DR): No início do campo 'content', adicione obrigatoriamente um resumo em exatos 3 bullet points curtos usando formatação HTML estrita: <b>Destaques:</b><ul><li>Ponto 1</li><li>Ponto 2</li><li>Ponto 3</li></ul><br/>` : ''}

      MISSÃO:
      Sua tarefa é transformar o conteúdo original em um artigo IRRESISTÍVEL de nível Premium.
      - Escreva um artigo JORNALÍSTICO completo, com profundidade e contexto.
      - Extensão: Busque entre 500 e 800 palavras se o assunto permitir. Nunca faça apenas resumos curtos.
      - Otimização SEO: Use palavras-chave naturalmente ao longo do texto.
      - Tags & Keywords: Gere no mínimo 10 tags e 10 keywords focadas em termos de busca orgânica de alto volume.
      - Se for uma RECEITA: Mantenha a precisão técnica, organize ingredientes e preparo de forma impecável. Use a persona de um Chef de Cozinha.
      - Se for NOTÍCIA: Use a pirâmide invertida, tom profissional e imparcial. Inclua antecedentes e contexto histórico se relevante.
      - Se for DICA/GUIA: Use tom educativo, autoritário e organizado.

      REGRAS DE TÍTULO (CRÍTICO):
      - Crie um título magnético (H1) que atraia cliques sem ser enganoso.
      - Título deve ser ÚNICO e ter no máximo 85 caracteres.
      - FORMATAÇÃO: OBRIGATÓRIO usar o padrão do jornalismo profissional brasileiro. Apenas a primeira letra da frase e nomes próprios devem ser maiúsculos (Sentence case). NUNCA capitalize a primeira letra de todas as palavras (PROIBIDO usar Title Case). Exemplo correto: "Brasil vence Venezuela e avança no torneio".

      ESTRUTURA DE CONTEÚDO E HTML (CRÍTICO):
      - Use HTML semântico (<h2>, <h3>, <b>, <ul>, <li>).
      - Divida o texto em parágrafos curtos para facilitar a leitura.
      - **REGRA DE NEGRITO**: Use a tag <b> ou <strong> apenas para termos curtos, nomes ou datas isoladas. NUNCA coloque parágrafos inteiros ou frases longas em negrito.
      - **FECHAMENTO DE TAGS**: Todas as tags HTML abertas (<b>, <p>, <ul>) devem ser obrigatoriamente fechadas antes do próximo bloco.
      - Enriqueça o texto com informações relevantes caso o original seja muito curto.
      - OBRIGATÓRIO: Se o texto original contiver créditos de imagem (ex: "Foto: Nome", "Crédito: Nome", "Imagem: Nome"), mantenha-os INTACTOS e adicione-os no final do seu artigo formatados em itálico.

      INSTRUÇÃO VISUAL:
      Crie um prompt detalhado em inglês (visual_prompt) para geração de imagem. Descreva a cena de forma fotorrealista, 8k, iluminação cinematográfica, focada no tema central do artigo.

      RETORNE APENAS JSON: { "title": "...", "slug": "...", "content": "...", "meta_description": "...", "social_summary": "...", "tags": [], "keywords": [], "visual_prompt": "..." }`;

    const { content: aiText, provider } = await ai.generateText({
      system: systemPrompt,
      user: `ORIGINAL: ${item.source_title}\n\n${item.source_content?.substring(0, 10000)}`,
      keys,
      preferredModel: wl?.ai_model,
      preferredProvider: wl?.ai_provider,
      logId,
      feedItemId
    });

    // Robust JSON parser — handles malformed AI output gracefully
    let rewritten: any;
    try {
      // 1. Strip markdown code blocks and trim
      let raw = aiText.replace(/```json|```/g, '').trim();
      
      // 2. Remove non-JSON characters before the first { and after the last }
      const firstBrace = raw.indexOf('{');
      const lastBrace = raw.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        raw = raw.slice(firstBrace, lastBrace + 1);
      }

      // 3. Handle common AI issues: newlines in strings, unescaped quotes
      // This is a complex step, we try standard parse first
      try {
        rewritten = JSON.parse(raw);
      } catch (e) {
        // If it fails, try a more aggressive cleanup
        const sanitized = raw
          .replace(/\\n/g, "\\n")
          .replace(/\\'/g, "'")
          .replace(/[\u0000-\u0019]+/g, "");
        rewritten = JSON.parse(sanitized);
      }
    } catch (parseErr: any) {
      console.error('[JSON Parse] Primary parse failed:', parseErr.message, '| Trying key-by-key extraction...');
      
      // Fallback: extract individual fields with regex
      const extract = (key: string) => {
        const regex = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'i');
        const m = aiText.match(regex);
        return m ? m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '';
      };
      
      const extractArr = (key: string) => {
        const regex = new RegExp(`"${key}"\\s*:\\s*\\[([^\\]]*)\\]`, 'i');
        const m = aiText.match(regex);
        if (!m) return [];
        return m[1].split(',').map((s) => s.trim().replace(/^"|"$/g, '').replace(/\\"/g, '"')).filter(Boolean);
      };

      rewritten = {
        title: extract('title') || item.source_title,
        slug: extract('slug') || (extract('title') ? extract('title').toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-') : ''),
        content: extract('content') || item.source_content,
        meta_description: extract('meta_description'),
        social_summary: extract('social_summary'),
        tags: extractArr('tags'),
        keywords: extractArr('keywords'),
        visual_prompt: extract('visual_prompt'),
      };
      console.warn('[JSON Parse] Used regex fallback for rewritten content.');
    }


    // 4. Image Generation — Vision analyzes source image → Imagen generates new original image
    let newImageUrl = null;
    if ((keys.gemini || keys.openai) && (item.source_image || rewritten.visual_prompt || customImagePrompt || customSourceImageB64)) {
      // Priority: uploaded image > feed image
      const sourceImageUrl = customSourceImageB64
        ? null  // b64 inline — passed separately below
        : (item.source_image ? getHighResImage(item.source_image) : null);
      const articleContext = `${rewritten.title}. ${rewritten.meta_description || ''}`;
      const fallbackPrompt = customImagePrompt 
        || rewritten.visual_prompt 
        || `Photorealistic news photo about: ${rewritten.title}. Cinematic composition, 8k, professional photojournalism.`;

      if (customSourceImageB64) {
        if (logId) await supabase.from('logs').update({ message: `IA: Processando imagem enviada pelo usuário como referência...` }).eq('id', logId);
      } else if (customImagePrompt) {
        if (logId) await supabase.from('logs').update({ message: `IA: Gerando imagem com prompt personalizado do usuário...` }).eq('id', logId);
      }

      newImageUrl = await ai.generateImage({
        prompt: fallbackPrompt,
        sourceImageUrl: sourceImageUrl || undefined,
        sourceImageB64: customSourceImageB64 || undefined,
        articleContext,
        keys,
        logId,
        feedItemId,
        orgSettings: wl,
        imageEngine: item.feeds?.image_engine,
        enhanceScrapedImage: item.feeds?.enhance_scraped_image
      });
    }

    // 5. Finalize - Save ALL data before triggering publish
    // Safety Check: Se o usuário apertar "Cancelar IA", o status muda para pending/error.
    const { data: currentItemStatus } = await supabase.from('feed_items').select('status').eq('id', feedItemId).maybeSingle();
    if (currentItemStatus?.status !== 'processing') {
       console.warn(`[RewriteEngine] Cancelado pelo usuário ou status alterado (Atual: ${currentItemStatus?.status}). Descartando IA.`);
       return new Response(JSON.stringify({ success: false, message: "Operação abortada/cancelada pelo usuário." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const ipMarker = '\u200B\u200C\u200B'; // Invisible marker to identify AI content
    const finalStatus = item.feeds.auto_publish ? 'ready' : 'success';
    
    // Safety check: if rewritten_image is an old temporary DALL-E URL, don't keep it
    const currentImage = item.rewritten_image;
    const isTempDalle = currentImage?.includes('oaidalleapiprodscus.blob.core.windows.net');
    const safeOldImage = isTempDalle ? null : currentImage;

    const { error: finalUpdateErr } = await supabase.from('feed_items').update({
      rewritten_title: rewritten.title + ipMarker,
      rewritten_content: rewritten.content + ipMarker,
      rewritten_image: newImageUrl || safeOldImage || item.source_image,
      slug: rewritten.slug,
      meta_description: rewritten.meta_description,
      social_summary: rewritten.social_summary,
      tags: rewritten.tags,
      keywords: rewritten.keywords,
      status: finalStatus,
      processed_at: new Date().toISOString()
    }).eq('id', feedItemId);

    if (finalUpdateErr) throw finalUpdateErr;

    if (logId) await supabase.from('logs').update({ status: 'success', step: 'complete', message: `IA Concluída via ${provider}` }).eq('id', logId);

    // 6. AUTO PUBLISH TRIGGER (Only after final save is confirmed)
    if (item.feeds.auto_publish) {
       const targetPlatform = item.feeds.target_platform || 'wordpress';
       console.log(`[RewriteEngine] Triggering auto-publish for: ${feedItemId} to platform: ${targetPlatform}`);
       
       if (targetPlatform === 'wordpress' || targetPlatform === 'blogger' || targetPlatform === 'wix') {
           const publishEndpoint = `publish-to-${targetPlatform}`;
           fetch(`${supabaseUrl}/functions/v1/${publishEndpoint}`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ feedItemId })
           }).catch(e => console.error(`Auto-publish to ${publishEndpoint} failed`, e));
       } else if (targetPlatform === 'local') {
           console.log(`[RewriteEngine] Auto-publish skipped because target is 'local'`);
       } else {
           console.log(`[RewriteEngine] Auto-publish for ${targetPlatform} not yet implemented dynamically.`);
       }
    }

    return new Response(JSON.stringify({ success: true, provider, rewritten_image: newImageUrl || undefined }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e: any) {
    console.error("Critical Error:", e);
    if (feedItemId) await supabase.from('feed_items').update({ status: 'error', error_message: e.message }).eq('id', feedItemId);
    return new Response(JSON.stringify({ success: false, error: e.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
