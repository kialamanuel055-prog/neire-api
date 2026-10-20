-- O Supabase expoe as tabelas do schema public por uma API publica (chave "anon").
-- Ativar RLS sem politicas e retirar permissoes bloqueia esse acesso.
-- A API NestJS liga-se como "postgres" e nao e afetada.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
