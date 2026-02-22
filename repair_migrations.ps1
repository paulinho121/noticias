$migrations = @(
"20260131034719_167052b9-150e-4e5c-a7cf-da412ade21c8",
"20260208100000_create_admin_notifications",
"20260208101000_update_categories_table",
"20260208103000_core_infrastructure",
"20260208104500_update_white_label_schema",
"20260208105000_setup_storage_buckets",
"20260210200000_white_label_isolation",
"20260211100000_fix_vulnerabilities",
"20260211110000_fix_feeds_rls",
"20260211120000_update_feed_items_ai_fields",
"20260212200000_add_rewritten_image_column",
"20260212210000_security_hardening",
"20260212220000_saas_management",
"20260212221000_user_management_expansion",
"20260212230000_force_master",
"20260212230100_add_jotavmkt_founder",
"20260212231000_manual_posts_support",
"20260212232000_fix_masked_keys_overwrite",
"20260215165500_nuclear_isolation_fix",
"20260215171000_final_security_hardening",
"20260216143000_add_source_video",
"20260216211000_add_labwpplus_master",
"20260218103500_fix_security_definer_view",
"20260218104500_harden_functions_search_path",
"20260218131000_add_feed_target_platform",
"20260218153000_fix_white_label_and_org_policies",
"20260218160000_nuclear_lockdown",
"20260218173500_add_ai_media_settings",
"20260218200000_create_news_images_bucket",
"20260220081000_nuclear_automation",
"20260220144600_add_ai_provider",
"20260220173406_logs_tenant_isolation",
"20260220205000_cascade_delete_users"
)

foreach ($mig in $migrations) {
    echo "Marking $mig as applied..."
    npx supabase migration repair --status applied $mig
}
echo "Running supabase db push..."
echo Y | npx supabase db push
