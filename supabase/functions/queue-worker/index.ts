
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const PROJECT_REF = "aozbgeguelpphxhptrwy";
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || `https://${PROJECT_REF}.supabase.co`;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[QueueWorker] Checking for pending tasks...");

    // 1. Pick top items from queue with locking logic
    // We use a RPC or a complex update to prevent race conditions
    // For now, let's use a simple approach: Pick 5 items that are not locked
    const { data: tasks, error: pickError } = await supabase
      .from('processing_queue')
      .select('*')
      .or(`status.eq.pending,status.eq.failed`)
      .lt('attempts', 3)
      .or(`locked_until.is.null,locked_until.lt.${new Date().toISOString()}`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(5);

    if (pickError) throw pickError;
    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No tasks to process' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[QueueWorker] Found ${tasks.length} tasks. Processing...`);

    const results = [];

    for (const task of tasks) {
      try {
        // Lock the task
        await supabase
          .from('processing_queue')
          .update({ 
            status: 'processing', 
            attempts: task.attempts + 1,
            locked_until: new Date(Date.now() + 5 * 60 * 1000).toISOString() // Lock for 5 mins
          })
          .eq('id', task.id);

        const payload = task.payload;
        let endpoint = '';
        
        if (payload.task === 'sync_and_process') {
          endpoint = 'process-feed';
        } else if (payload.task === 'rewrite_content') {
          endpoint = 'rewrite-content';
        }

        if (endpoint) {
          console.log(`[QueueWorker] Executing ${endpoint} for task ${task.id}`);
          const res = await fetch(`${supabaseUrl}/functions/v1/${endpoint}`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${supabaseKey}`, 
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Worker execution failed: ${errorText}`);
          }
        }

        // Mark as completed
        await supabase
          .from('processing_queue')
          .update({ status: 'completed', processed_at: new Date().toISOString(), locked_until: null })
          .eq('id', task.id);

        results.push({ id: task.id, status: 'success' });
      } catch (err: any) {
        console.error(`[QueueWorker] Error processing task ${task.id}:`, err.message);
        
        await supabase
          .from('processing_queue')
          .update({ 
            status: 'failed', 
            error_message: err.message,
            locked_until: null 
          })
          .eq('id', task.id);
        
        results.push({ id: task.id, status: 'failed', error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error(`[QueueWorker] Fatal:`, error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
