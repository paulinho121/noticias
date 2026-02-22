const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envData = fs.readFileSync('.env', 'utf8');
const envLines = envData.split('\n');
const env = {};
envLines.forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/['"]/g, '');
        env[key] = value;
    }
});

async function run() {
    const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const { data } = await supabase.from('platform_settings').select('credentials').ilike('platform_id', '%gemini%').limit(1);
    const key = data?.[0]?.credentials?.api_key || env.GEMINI_API_KEY;

    if (!key) {
        console.log("No gemini key found");
        return;
    }

    const payload = {
        contents: [{ parts: [{ text: "Draw a funny dog." }] }],
        generationConfig: {
            responseModalities: ["IMAGE"]
        }
    };

    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    try {
        const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await r.json();
        console.log("gemini-2.5-flash / v1beta response keys:", Object.keys(result));
        if (result.error) console.log("ERROR:", result.error);
        if (result.candidates?.[0]?.content?.parts?.[0]) {
            console.log("PART KEYS:", Object.keys(result.candidates[0].content.parts[0]));
        }
    } catch (e) { console.error(e); }
}

run();
