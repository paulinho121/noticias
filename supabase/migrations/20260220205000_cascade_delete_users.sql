-- Migration para adicionar ON DELETE CASCADE a todas as chaves estrangeiras que referenciam auth.users
-- Isso resolve o erro "update or delete on table users violates foreign key constraint" ao tentar apagar uma conta.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT
            tc.table_schema, 
            tc.table_name, 
            tc.constraint_name,
            kcu.column_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu 
              ON tc.constraint_name = kcu.constraint_name 
              AND tc.table_schema = kcu.table_schema 
            JOIN information_schema.constraint_column_usage AS ccu 
              ON ccu.constraint_name = tc.constraint_name 
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_schema = 'public'
          AND ccu.table_schema = 'auth'
          AND ccu.table_name = 'users'
          AND ccu.column_name = 'id'
    LOOP
        -- Remove a constraint existente
        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I;', r.table_schema, r.table_name, r.constraint_name);
        
        -- Recria a constraint com ON DELETE CASCADE
        EXECUTE format('ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE CASCADE;', r.table_schema, r.table_name, r.constraint_name, r.column_name);
    END LOOP;
END $$;
