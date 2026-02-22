
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
// fetch is global in Node 22+
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://aozbgeguelpphxhptrwy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY is required to fix schema');
    process.exit(1);
}

const sql = `
DO $$ 
BEGIN
    -- 1. Garante que a tabela exista
    CREATE TABLE IF NOT EXISTS public.processing_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payload JSONB NOT NULL,
        status TEXT DEFAULT 'pending',
        priority INTEGER DEFAULT 0,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    -- 2. Adiciona colunas faltantes se necessário
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'processing_queue' AND column_name = 'organization_id') THEN
        ALTER TABLE public.processing_queue ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'processing_queue' AND column_name = 'feed_id') THEN
        ALTER TABLE public.processing_queue ADD COLUMN feed_id UUID REFERENCES public.feeds(id) ON DELETE CASCADE;
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

    -- 4. Garante que o índice exista para performance
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'processing_queue' AND indexname = 'idx_queue_lookup') THEN
        CREATE INDEX idx_queue_lookup ON public.processing_queue(status, scheduled_for, priority DESC);
    END IF;

    RAISE NOTICE 'Schema da processing_queue validado e reparado com sucesso.';
END $$;
`;

async function fixSchema() {
    console.log('Running schema fix for processing_queue via run-sql-once...');

    try {
        const response = await fetch(`${supabaseUrl}/functions/v1/run-sql-once`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ query: sql })
        });

        const result = await response.text();
        if (response.ok) {
            console.log('SUCCESS: processing_queue schema fixed!');
            console.log('Output:', result);
        } else {
            console.error('SERVER ERROR:', result);
            process.exit(1);
        }
    } catch (err) {
        console.error('FETCH ERROR:', err.message);
        process.exit(1);
    }
}

fixSchema();
