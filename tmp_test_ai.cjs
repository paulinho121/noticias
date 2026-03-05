const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// read .env
const envFiles = ['.env', '.env.local'];
let env = {};
envFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        content.split('\n').forEach(line => {
            const idx = line.indexOf('=');
            if (idx !== -1) {
                env[line.substring(0, idx).trim()] = line.substring(idx + 1).trim().replace(/^"|"$/g, '');
            }
        });
    }
});

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAi() {
    const item = {
        source_title: "Caixa Econômica Federal tem lucro de R$ 15,5 bilhões em 2025",
        source_content: "A Caixa Econômica Federal registrou lucro líquido recorrente de R$ 15,5 bilhões em 2025, um aumento de 10,4% em relação ao ano anterior. O resultado foi divulgado na noite de ontem..."
    };

    const systemPrompt = `Você é um Editor-Chefe e Especialista em SEO de nível sênior. 
      TONALIDADE: Tom profissional, fatos, pirâmide invertida.
      MISSÃO: Transformar o conteúdo original em um artigo IRRESISTÍVEL de nível Premium.
      REGRAS DE TÍTULO (CRÍTICO): Sentence case.
      RETORNE APENAS JSON: { "title": "...", "slug": "...", "content": "...", "meta_description": "...", "social_summary": "...", "tags": [], "keywords": [], "visual_prompt": "..." }`;

    const body = {
        model: "gpt-4o-mini",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `ORIGINAL: ${item.source_title}\n\n${item.source_content}` }
        ],
        response_format: { type: "json_object" }
    };

    const apiKey = env.OPENAI_API_KEY || env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
        console.error("NO API KEY");
        return;
    }

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    const data = await resp.json();
    console.log("AI RESPONSE RAW:", JSON.stringify(data.choices?.[0]?.message?.content, null, 2));
}

testAi();
