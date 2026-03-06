const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
const SUPABASE_URL = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1] || process.env.VITE_SUPABASE_URL || env.match(/SUPABASE_URL=(.*)/)?.[1];
const SUPABASE_SERVICE_ROLE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("ERRO: Credenciais do Supabase não encontradas.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function migrateModels() {
    console.log('Iniciando migração FORÇADA de modelos de IA para gemini-2.5-flash...');

    try {
        // 1. Forçar em white_label_settings
        console.log('Atualizando configurações white label...');
        const { data: wlData, error: wlError } = await supabase
        .from('white_label_settings')
        .update({ ai_model: 'gemini-2.5-flash' })
        // Apenas atualizar onde não for gemini-2.5-flash
        .neq('ai_model', 'gemini-2.5-flash')
        .select();

        if (wlError) {
            console.error('Erro ao atualizar white label:', wlError);
        } else {
            console.log(`Forçados ${wlData?.length || 0} white_label_settings para gemini-2.5-flash`);
        }

        // 2. Forçar em feeds (Verificando se a coluna existe e capturando o erro)
        console.log('-------------------------');
        console.log('Tentando atualizar a tabela feeds...');
        const { data: feedsList } = await supabase.from('feeds').select('id, name');
        let updatedFeedsCount = 0;

        if (feedsList) {
          for (const feed of feedsList) {
            const { error: feedUpdateError } = await supabase.from('feeds').update({ ai_model: 'gemini-2.5-flash' }).eq('id', feed.id);
            if (!feedUpdateError) updatedFeedsCount++;
          }
           console.log(`Forçados ${updatedFeedsCount} feeds para gemini-2.5-flash (Ignorado caso a tabela não possua a coluna).`);
        }


        console.log('=============================');
        console.log('MIGRAÇÃO FORÇADA CONCLUÍDA!');
        console.log('Verifique o sistema agora.');
        
    } catch (error) {
        console.error('CATCH ERRO CRÍTICO:', error);
    }
}

migrateModels();
