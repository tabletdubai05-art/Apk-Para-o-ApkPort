-- ============================================================================
-- DROIDPORT STORE — BANCO PRINCIPAL (mfwzkzywxvbbonsshjgh)
-- Migração 001: Arquitetura de Administradores Baseada em auth.uid()
--
-- IMPORTANTE:
-- - NÃO execute automaticamente sem revisar.
-- - Execute no SQL Editor do projeto Supabase PRINCIPAL.
-- - Nunca confie em user_metadata editável pelo usuário nem em localStorage.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admins IS
  'Lista autoritativa de administradores do DroidPort Store validada por auth.uid() no servidor.';

-- Isolamento estrito de permissões na tabela de administradores
REVOKE ALL ON TABLE public.admins FROM PUBLIC;
REVOKE ALL ON TABLE public.admins FROM anon;
REVOKE ALL ON TABLE public.admins FROM authenticated;

-- Usuário autenticado só pode consultar se o próprio UID está listado (sem enumerar outros admins)
GRANT SELECT ON TABLE public.admins TO authenticated;

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_select_own" ON public.admins;
CREATE POLICY "admins_select_own"
  ON public.admins
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND ativo = true);

-- Função central de verificação administrativa no servidor (SECURITY DEFINER protegido)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins a
    WHERE a.user_id = auth.uid()
      AND a.ativo = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated, service_role;

-- ============================================================================
-- PASSO MANUAL PÓS-MIGRAÇÃO:
-- Substitua o UUID abaixo pelo auth.users.id real da conta do administrador
-- (verifique em Authentication -> Users no Supabase Principal):
--
-- INSERT INTO public.admins (user_id, email, role, ativo)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'seu-email-admin@exemplo.com', 'super_admin', true)
-- ON CONFLICT (user_id) DO UPDATE SET ativo = true, role = EXCLUDED.role;
-- ============================================================================
