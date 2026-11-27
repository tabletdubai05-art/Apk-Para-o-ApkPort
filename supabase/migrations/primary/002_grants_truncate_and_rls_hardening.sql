-- ============================================================================
-- DROIDPORT STORE — BANCO PRINCIPAL (mfwzkzywxvbbonsshjgh)
-- Migração 002: Remoção de GRANT/TRUNCATE indevidos, Políticas RLS e Storage
--
-- Depende da execução prévia da migração 001_admin_role_architecture.sql.
-- ============================================================================

-- Protege futuras tabelas contra TRUNCATE acidental ou malicioso
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE TRUNCATE ON TABLES FROM PUBLIC, anon, authenticated;

-- 1. Limpa privilégios amplos e revoga TRUNCATE de todas as tabelas públicas do catálogo/loja
DO $$
DECLARE
  tbl text;
  target_tables text[] := ARRAY[
    'jogos',
    'categorias',
    'categoria_jogos',
    'config',
    'discord',
    'aceitar'
  ];
BEGIN
  FOREACH tbl IN ARRAY target_tables LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated;', tbl);
      EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon, authenticated;', tbl);
      -- Escritas continuam exigindo RLS public.is_admin(); TRUNCATE permanece revogado mesmo para authenticated
      EXECUTE format('GRANT INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated;', tbl);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    END IF;
  END LOOP;
END $$;

-- 2. Remove políticas legadas potencialmente permissivas nas tabelas principais
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('jogos', 'categorias', 'categoria_jogos', 'config', 'discord', 'aceitar')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- 3. Políticas de leitura pública + escrita estritamente administrativa (jogos, categorias, categoria_jogos, config, discord)
DO $$
DECLARE
  tbl text;
  catalog_tables text[] := ARRAY['jogos', 'categorias', 'categoria_jogos', 'config', 'discord'];
BEGIN
  FOREACH tbl IN ARRAY catalog_tables LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true);',
        tbl || '_public_select',
        tbl
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin());',
        tbl || '_admin_insert',
        tbl
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());',
        tbl || '_admin_update',
        tbl
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin());',
        tbl || '_admin_delete',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- 4. Políticas estritas para tabela `aceitar` (solicitações pendentes visíveis apenas ao admin)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'aceitar'
  ) THEN
    CREATE POLICY "aceitar_public_select_apenas_aprovadas"
      ON public.aceitar
      FOR SELECT
      TO anon, authenticated
      USING (aceito = true OR public.is_admin());

    CREATE POLICY "aceitar_admin_insert"
      ON public.aceitar
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin());

    CREATE POLICY "aceitar_admin_update"
      ON public.aceitar
      FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());

    CREATE POLICY "aceitar_admin_delete"
      ON public.aceitar
      FOR DELETE
      TO authenticated
      USING (public.is_admin());
  END IF;
END $$;

-- 5. Proteção de Storage (storage.objects): leitura pública apenas em buckets públicos, escrita apenas para admins
DO $$
DECLARE
  pol record;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'objects'
  ) THEN
    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname LIKE 'droidport_%'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects;', pol.policyname);
    END LOOP;

    -- Garante que uploads, sobrescritas e exclusões em buckets não sejam feitos por anon
    CREATE POLICY "droidport_storage_admin_insert"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (public.is_admin());

    CREATE POLICY "droidport_storage_admin_update"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (public.is_admin());

    CREATE POLICY "droidport_storage_admin_delete"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (public.is_admin());
  END IF;
END $$;
