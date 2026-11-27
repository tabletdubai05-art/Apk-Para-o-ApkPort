-- ============================================================================
-- DROIDPORT STORE — BANCO PRINCIPAL (mfwzkzywxvbbonsshjgh)
-- Migração 004: Índices de Escalabilidade para Consultas Paginadas
-- ============================================================================

DO $$
BEGIN
  -- Índices em public.jogos
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jogos' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_jogos_created_id_desc
      ON public.jogos (created_at DESC, id DESC);

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jogos' AND column_name = 'destaque') THEN
      CREATE INDEX IF NOT EXISTS idx_jogos_destaque_created_desc
        ON public.jogos (destaque, created_at DESC)
        WHERE destaque = true;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'jogos' AND column_name = 'categoria') THEN
    CREATE INDEX IF NOT EXISTS idx_jogos_categoria
      ON public.jogos (categoria);
  END IF;

  -- Índices em public.categorias
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categorias' AND column_name = 'ordem') THEN
    CREATE INDEX IF NOT EXISTS idx_categorias_ordem_created
      ON public.categorias (ordem ASC NULLS LAST, created_at DESC);
  END IF;

  -- Índices em public.categoria_jogos
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categoria_jogos' AND column_name = 'categoria_id') THEN
    CREATE INDEX IF NOT EXISTS idx_categoria_jogos_cat_ordem
      ON public.categoria_jogos (categoria_id, ordem ASC NULLS LAST, id ASC);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'categoria_jogos' AND column_name = 'jogo_id') THEN
    CREATE INDEX IF NOT EXISTS idx_categoria_jogos_jogo_id
      ON public.categoria_jogos (jogo_id);
  END IF;

  -- Índices em public.aceitar
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'aceitar' AND column_name = 'aceito') THEN
    CREATE INDEX IF NOT EXISTS idx_aceitar_aprovados_recentes
      ON public.aceitar (created_at DESC, id DESC)
      WHERE aceito = true;

    CREATE INDEX IF NOT EXISTS idx_aceitar_pendentes
      ON public.aceitar (created_at DESC, id DESC)
      WHERE aceito = false;
  END IF;

  -- Índices em public.discord
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'discord' AND column_name = 'created_at') THEN
    CREATE INDEX IF NOT EXISTS idx_discord_created_id_desc
      ON public.discord (created_at DESC, id DESC);
  END IF;
END $$;
