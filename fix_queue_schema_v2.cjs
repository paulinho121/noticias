
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://aozbgeguelpphxhptrwy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sql = `
DO $$ 
BEGIN
    -- Verificação completa de todas as colunas necessárias
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'processing_queue' AND column_name = 'organization_id') THEN
        ALTER TABLE public.processing_queue ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'processing_queue' AND column_name = 'feed_id') THEN
        ALTER TABLE public.processing_queue ADD COLUMN feed_id UUID REFERENCES public.feeds(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'processing_queue' AND column_name = 'priority') THEN
        ALTER TABLE public.processing_queue ADD COLUMN priority INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'processing_queue' AND column_name = 'attempts') THEN
        ALTER TABLE public.processing_queue ADD COLUMN attempts INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'processing_queue' AND column_name = 'max_attempts') THEN
        ALTER TABLE public.processing_queue ADD COLUMN max_attempts INTEGER DEFAULT 3;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'processing_queue' AND column_name = 'error_message') THEN
        ALTER TABLE public.processing_queue ADD COLUMN error_message TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'processing_queue' AND column_name = 'processed_at') THEN
        ALTER TABLE public.processing_queue ADD COLUMN processed_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'processing_queue' AND column_name = 'locked_until') THEN
        ALTER TABLE public.processing_queue ADD COLUMN locked_until TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'processing_queue' AND column_name = 'scheduled_for') THEN
        ALTER TABLE public.processing_queue ADD COLUMN scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;

    RAISE NOTICE 'Reparo completo de colunas finalizado.';
END $$;
`;

async function fixSchema() {
    console.log('Running final comprehensive schema fix...');
    try {
        const response = await fetch(supabaseUrl + '/functions/v1/run-sql-once', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + supabaseKey
            },
            body: JSON.stringify({ query: sql })
        });
        const result = await response.text();
        console.log('Result:', result);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

fixSchema();
