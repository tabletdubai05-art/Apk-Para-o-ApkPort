-- ============================================================================
-- DROIDPORT STORE — BANCO SECUNDÁRIO / COMUNIDADE (gtkitrxssdkncjpwzvjl)
-- Migração 001: Hardening de relatos_desempenho (GRANT, TRUNCATE, RLS, Checks, Índices)
--
-- IMPORTANTE:
-- - NÃO execute automaticamente sem revisar.
-- - Execute no SQL Editor do projeto Supabase SECUNDÁRIO (OAuth + Comunidade).
-- ============================================================================

DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'relatos_desempenho'
  ) THEN
    -- 1. Revoga privilégios excessivos (incluindo TRUNCATE)
    REVOKE ALL ON TABLE public.relatos_desempenho FROM PUBLIC, anon, authenticated;
    GRANT SELECT ON TABLE public.relatos_desempenho TO anon, authenticated;
    GRANT INSERT, UPDATE, DELETE ON TABLE public.relatos_desempenho TO authenticated;

    ALTER TABLE public.relatos_desempenho ENABLE ROW LEVEL SECURITY;

    -- 2. Remove políticas legadas antes de aplicar as estritas
    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'relatos_desempenho'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.relatos_desempenho;', pol.policyname);
    END LOOP;

    -- Leitura pública dos relatos de compatibilidade
    CREATE POLICY "relatos_select_publico"
      ON public.relatos_desempenho
      FOR SELECT
      TO anon, authenticated
      USING (true);

    -- Apenas usuário autenticado pode criar relato vinculado ao próprio auth.uid()
    CREATE POLICY "relatos_insert_proprio_uid"
      ON public.relatos_desempenho
      FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.uid() IS NOT NULL
        AND auth.uid() = user_id
      );

    -- Apenas o autor pode editar o próprio relato e nunca alterar user_id para outro usuário
    CREATE POLICY "relatos_update_proprio_uid"
      ON public.relatos_desempenho
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    -- Apenas o autor pode excluir o próprio relato
    CREATE POLICY "relatos_delete_proprio_uid"
      ON public.relatos_desempenho
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);

    -- 3. Constraints defensivos contra abuso/spam e URLs inseguras (NOT VALID para compatibilidade com histórico)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_relatos_nota_range') THEN
      ALTER TABLE public.relatos_desempenho
        ADD CONSTRAINT chk_relatos_nota_range
        CHECK (nota >= 1 AND nota <= 5) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_relatos_fps_range') THEN
      ALTER TABLE public.relatos_desempenho
        ADD CONSTRAINT chk_relatos_fps_range
        CHECK (fps IS NULL OR (fps >= 1 AND fps <= 300)) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_relatos_marca_len') THEN
      ALTER TABLE public.relatos_desempenho
        ADD CONSTRAINT chk_relatos_marca_len
        CHECK (char_length(btrim(marca)) BETWEEN 1 AND 60) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_relatos_modelo_len') THEN
      ALTER TABLE public.relatos_desempenho
        ADD CONSTRAINT chk_relatos_modelo_len
        CHECK (char_length(btrim(modelo)) BETWEEN 1 AND 80) NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_relatos_avatar_https') THEN
      ALTER TABLE public.relatos_desempenho
        ADD CONSTRAINT chk_relatos_avatar_https
        CHECK (usuario_avatar IS NULL OR usuario_avatar ~* '^https://[^\s]+$') NOT VALID;
    END IF;

    -- 4. Índices para listagem paginada por jogo e controle por autor
    CREATE INDEX IF NOT EXISTS idx_relatos_jogo_created_desc
      ON public.relatos_desempenho (jogo_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_relatos_user_created_desc
      ON public.relatos_desempenho (user_id, created_at DESC);
  END IF;
END $$;
