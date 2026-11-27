-- ============================================================================
-- DROIDPORT STORE — BANCO PRINCIPAL (mfwzkzywxvbbonsshjgh)
-- Migração 003: Hardening de SECURITY DEFINER, Constraints de URL/SHA-256 e
--               RPC Administrativa de Aprovação de Atualizações
--
-- Depende das migrações 001 e 002.
-- ============================================================================

-- 1. Colunas opcionais para integridade SHA-256 e auditoria de aprovação
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'config'
  ) THEN
    ALTER TABLE public.config ADD COLUMN IF NOT EXISTS sha256 text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'aceitar'
  ) THEN
    ALTER TABLE public.aceitar ADD COLUMN IF NOT EXISTS sha256 text;
    ALTER TABLE public.aceitar ADD COLUMN IF NOT EXISTS aceito_em timestamptz;
    ALTER TABLE public.aceitar ADD COLUMN IF NOT EXISTS aceito_por uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2. Constraints defensivos contra links perigosos (NOT VALID protege linhas legadas e bloqueia novos registros inválidos)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'config'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_config_link_apk_https') THEN
      ALTER TABLE public.config
        ADD CONSTRAINT chk_config_link_apk_https
        CHECK (link_apk IS NULL OR link_apk ~* '^https://[^\s]+$') NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_config_sha256_hex') THEN
      ALTER TABLE public.config
        ADD CONSTRAINT chk_config_sha256_hex
        CHECK (sha256 IS NULL OR sha256 ~* '^[a-f0-9]{64}$') NOT VALID;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'aceitar'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_aceitar_link_apk_https') THEN
      ALTER TABLE public.aceitar
        ADD CONSTRAINT chk_aceitar_link_apk_https
        CHECK (link_apk IS NULL OR link_apk ~* '^https://[^\s]+$') NOT VALID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_aceitar_sha256_hex') THEN
      ALTER TABLE public.aceitar
        ADD CONSTRAINT chk_aceitar_sha256_hex
        CHECK (sha256 IS NULL OR sha256 ~* '^[a-f0-9]{64}$') NOT VALID;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'discord'
  ) THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_discord_link_host') THEN
      ALTER TABLE public.discord
        ADD CONSTRAINT chk_discord_link_host
        CHECK (link IS NULL OR link ~* '^https://([a-z0-9-]+\.)?(discord\.gg|discord\.com|discordapp\.com)/[^\s]+$') NOT VALID;
    END IF;
  END IF;
END $$;

-- 3. Trigger function protegida (SECURITY DEFINER com search_path fixo)
--    Ao inserir/alterar versão em `config`, cria solicitação pendente (`aceito = false`) em `aceitar`.
CREATE OR REPLACE FUNCTION public.fn_config_gera_solicitacao_aceitar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new jsonb := to_jsonb(NEW);
  v_versao text := btrim(COALESCE(v_new ->> 'versao_atual', ''));
  v_link text := NULLIF(btrim(COALESCE(v_new ->> 'link_apk', '')), '');
  v_notes text := NULLIF(btrim(COALESCE(v_new ->> 'release_notes', '')), '');
  v_sha256 text := NULLIF(lower(btrim(COALESCE(v_new ->> 'sha256', ''))), '');
BEGIN
  IF v_versao = '' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.versao_atual IS NOT DISTINCT FROM NEW.versao_atual
     AND OLD.link_apk IS NOT DISTINCT FROM NEW.link_apk THEN
    RETURN NEW;
  END IF;

  -- Evita duplicar solicitação pendente para a mesma versão
  IF NOT EXISTS (
    SELECT 1
    FROM public.aceitar a
    WHERE a.versao = v_versao
      AND a.aceito = false
  ) THEN
    INSERT INTO public.aceitar (versao, link_apk, release_notes, sha256, aceito)
    VALUES (v_versao, v_link, v_notes, v_sha256, false);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_config_gera_solicitacao_aceitar() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'config'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'aceitar'
  ) THEN
    DROP TRIGGER IF EXISTS trg_config_gera_solicitacao_aceitar ON public.config;
    CREATE TRIGGER trg_config_gera_solicitacao_aceitar
      AFTER INSERT OR UPDATE OF versao_atual, link_apk ON public.config
      FOR EACH ROW
      EXECUTE FUNCTION public.fn_config_gera_solicitacao_aceitar();
  END IF;
END $$;

-- 4. RPC protegida para o App Admin aprovar uma solicitação de atualização
CREATE OR REPLACE FUNCTION public.admin_aprovar_atualizacao(p_solicitacao_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.aceitar%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem aprovar atualizações.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row
  FROM public.aceitar
  WHERE id::text = p_solicitacao_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação de atualização não encontrada.'
      USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.aceitar
  SET aceito = true,
      aceito_em = now(),
      aceito_por = auth.uid()
  WHERE id::text = p_solicitacao_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_aprovar_atualizacao(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_aprovar_atualizacao(text) TO authenticated, service_role;

-- 5. RPC protegida para o App Admin rejeitar/remover uma solicitação pendente
CREATE OR REPLACE FUNCTION public.admin_rejeitar_atualizacao(p_solicitacao_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem rejeitar atualizações.'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.aceitar
  WHERE id::text = p_solicitacao_id
    AND aceito = false;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_rejeitar_atualizacao(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_rejeitar_atualizacao(text) TO authenticated, service_role;
