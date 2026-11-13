import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import {
  Check,
  Cpu,
  Gauge,
  LogOut,
  MessageSquarePlus,
  Pencil,
  Search,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import {
  communitySupabase,
  isNativeApp,
  PENDING_REPORT_GAME_KEY,
  signInCommunityWithGoogle,
} from '../lib/communitySupabase';
import type { RelatoDesempenho } from '../types/game';
import {
  detectCurrentDevice,
  inferBrandFromModel,
} from '../utils/deviceDetector';

const BRAND_OPTIONS = [
  'Samsung',
  'Xiaomi',
  'ASUS',
  'Nubia',
  'RedMagic',
  'OnePlus',
  'OPPO',
  'Realme',
  'Vivo',
  'iQOO',
  'Huawei',
  'Honor',
  'Motorola',
  'Apple',
  'Google Pixel',
  'Sony',
  'Nothing',
  'Lenovo',
  'ZTE',
  'Meizu',
  'Infinix',
  'Outra',
] as const;

const FPS_OPTIONS = [15, 20, 25, 30, 40, 45, 60, 90, 120, 144] as const;

const TAG_OPTIONS = [
  'FPS estável',
  'Engasgos',
  'Fecha sozinho',
  'Falhas gráficas',
  'Problemas de áudio',
  'Esquenta muito',
  'Gasta muita bateria',
  'Carregamento demorado',
  'Precisa de patch',
  'Funciona com controle',
  'Toque funciona bem',
] as const;

const MAX_TAGS = 6;

const RATING_LABELS: Record<number, string> = {
  1: 'Não roda',
  2: 'Roda mal',
  3: 'Jogável',
  4: 'Roda bem',
  5: 'Perfeito',
};

function getRatingStyles(nota: number): string {
  if (nota >= 4) {
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  }
  if (nota === 3) {
    return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  }
  return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
}

function formatRelativeTime(isoDate: string): string {
  const time = new Date(isoDate).getTime();
  if (Number.isNaN(time)) return 'recentemente';

  const diffSeconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (diffSeconds < 60) return 'agora mesmo';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `há ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours} h`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `há ${diffDays} d`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return diffMonths === 1 ? 'há 1 mês' : `há ${diffMonths} meses`;
  }

  const diffYears = Math.floor(diffMonths / 12);
  return diffYears === 1 ? 'há 1 ano' : `há ${diffYears} anos`;
}

function getUserDisplayName(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fullName =
    (typeof meta?.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta?.name === 'string' && meta.name.trim());
  if (fullName) return fullName;
  if (user.email) return user.email.split('@')[0];
  return 'Jogador';
}

function getUserAvatarUrl(user: User): string | null {
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const url =
    (typeof meta?.avatar_url === 'string' && meta.avatar_url.trim()) ||
    (typeof meta?.picture === 'string' && meta.picture.trim());
  return url || null;
}

interface ReportAvatarProps {
  name: string;
  avatarUrl?: string | null;
}

function ReportAvatar({ name, avatarUrl }: ReportAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const initial = (name.trim()[0] || 'J').toUpperCase();

  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className="w-10 h-10 rounded-full object-cover border border-[#2A2738] shrink-0"
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] text-white font-bold text-sm flex items-center justify-center shrink-0 border border-[#8B5CF6]/40">
      {initial}
    </div>
  );
}

interface DeviceCompatibilitySectionProps {
  jogoId: string;
  jogoTitulo: string;
  autoOpenReportModal?: boolean;
  onConsumeAutoOpen?: () => void;
}

export function DeviceCompatibilitySection({
  jogoId,
  jogoTitulo,
  autoOpenReportModal = false,
  onConsumeAutoOpen,
}: DeviceCompatibilitySectionProps) {
  const [relatos, setRelatos] = useState<RelatoDesempenho[]>([]);
  const [loadingRelatos, setLoadingRelatos] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deviceSearch, setDeviceSearch] = useState('');

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [showReportModal, setShowReportModal] = useState(false);
  const [editingSpecs, setEditingSpecs] = useState(false);
  const [detectingDevice, setDetectingDevice] = useState(false);

  // Report form fields
  const [marca, setMarca] = useState<string>('');
  const [modelo, setModelo] = useState<string>('');
  const [chipset, setChipset] = useState<string>('');
  const [gpu, setGpu] = useState<string>('');
  const [ram, setRam] = useState<string>('');
  const [androidVersao, setAndroidVersao] = useState<string>('');
  const [fps, setFps] = useState<number | null>(null);
  const [nota, setNota] = useState<number>(4);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchRelatos = useCallback(async () => {
    setLoadingRelatos(true);
    setLoadError(null);
    try {
      const { data, error } = await communitySupabase
        .from('relatos_desempenho')
        .select('*')
        .eq('jogo_id', jogoId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setRelatos((data as RelatoDesempenho[]) || []);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar os relatos da comunidade.';
      setLoadError(msg);
    } finally {
      setLoadingRelatos(false);
    }
  }, [jogoId]);

  useEffect(() => {
    void fetchRelatos();
  }, [fetchRelatos]);

  const openReportFormWithDetection = useCallback(async () => {
    setSubmitError(null);
    setFps(null);
    setNota(4);
    setSelectedTags([]);
    setShowReportModal(true);
    setDetectingDevice(true);

    try {
      const detected = await detectCurrentDevice();
      setModelo(detected.modelo);
      setChipset(detected.chipset);
      setGpu(detected.gpu);
      setRam(detected.ram);
      setAndroidVersao(detected.androidVersao);
      setMarca(detected.marca);
      setEditingSpecs(!detected.modelo || !detected.chipset);
    } finally {
      setDetectingDevice(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    communitySupabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setCurrentUser(data.session?.user ?? null);
    });

    const { data: authListener } = communitySupabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        const nextUser = session?.user ?? null;
        setCurrentUser(nextUser);

        if (nextUser) {
          setAuthLoading(false);
          setShowAuthModal(false);
          try {
            const pendingGame = localStorage.getItem(PENDING_REPORT_GAME_KEY);
            if (pendingGame === jogoId) {
              localStorage.removeItem(PENDING_REPORT_GAME_KEY);
              void openReportFormWithDetection();
            }
          } catch {
            // Ignore storage errors
          }
        }
      }
    );

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [jogoId, openReportFormWithDetection]);

  // Automatically open report modal after returning from Google OAuth
  useEffect(() => {
    if (autoOpenReportModal && currentUser) {
      onConsumeAutoOpen?.();
      void openReportFormWithDetection();
    }
  }, [
    autoOpenReportModal,
    currentUser,
    onConsumeAutoOpen,
    openReportFormWithDetection,
  ]);

  const handleClickReportButton = async () => {
    setAuthError(null);
    const { data } = await communitySupabase.auth.getSession();
    const user = data.session?.user ?? currentUser;

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setCurrentUser(user);
    void openReportFormWithDetection();
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      try {
        localStorage.setItem(PENDING_REPORT_GAME_KEY, jogoId);
      } catch {
        // Ignore storage errors
      }

      await signInCommunityWithGoogle();

      if (isNativeApp()) {
        setAuthLoading(false);
      }
    } catch (err) {
      setAuthLoading(false);
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Não foi possível iniciar o login com Google.'
      );
    }
  };

  const handleSignOut = async () => {
    await communitySupabase.auth.signOut();
    setCurrentUser(null);
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) {
        return prev.filter((item) => item !== tag);
      }
      if (prev.length >= MAX_TAGS) {
        return prev;
      }
      return [...prev, tag];
    });
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!currentUser) {
      setShowReportModal(false);
      setShowAuthModal(true);
      return;
    }

    const cleanModel = modelo.trim();
    const cleanBrand = marca.trim() || inferBrandFromModel(cleanModel) || 'Outra';

    if (!cleanModel) {
      setEditingSpecs(true);
      setSubmitError('Informe o modelo do seu aparelho para enviar o relato.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        jogo_id: jogoId,
        user_id: currentUser.id,
        usuario_nome: getUserDisplayName(currentUser),
        usuario_avatar: getUserAvatarUrl(currentUser),
        marca: cleanBrand,
        modelo: cleanModel,
        chipset: chipset.trim() || null,
        gpu: gpu.trim() || null,
        ram: ram.trim() || null,
        android_versao: androidVersao.trim() || null,
        fps,
        nota,
        tags: selectedTags,
      };

      const { data, error } = await communitySupabase
        .from('relatos_desempenho')
        .insert(payload)
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      if (data) {
        setRelatos((prev) => [data as RelatoDesempenho, ...prev]);
      } else {
        await fetchRelatos();
      }

      setShowReportModal(false);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3500);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Erro ao salvar relato. Tente novamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteOwnReport = async (relatoId: string) => {
    try {
      const { error } = await communitySupabase
        .from('relatos_desempenho')
        .delete()
        .eq('id', relatoId);

      if (!error) {
        setRelatos((prev) => prev.filter((item) => item.id !== relatoId));
      }
    } catch {
      // Ignore silent errors
    }
  };

  // Summary calculations
  const summary = useMemo(() => {
    const total = relatos.length;
    if (total === 0) {
      return {
        total: 0,
        mediaNota: '0,0',
        mediaFps: null as number | null,
        bom: 0,
        jogavel: 0,
        ruim: 0,
      };
    }

    let sumNota = 0;
    let sumFps = 0;
    let fpsCount = 0;
    let bom = 0;
    let jogavel = 0;
    let ruim = 0;

    for (const r of relatos) {
      sumNota += r.nota;
      if (r.nota >= 4) bom += 1;
      else if (r.nota === 3) jogavel += 1;
      else ruim += 1;

      if (typeof r.fps === 'number' && r.fps > 0) {
        sumFps += r.fps;
        fpsCount += 1;
      }
    }

    const mediaNotaNum = sumNota / total;
    const mediaNota = mediaNotaNum.toFixed(1).replace('.', ',');
    const mediaFps = fpsCount > 0 ? Math.round(sumFps / fpsCount) : null;

    return {
      total,
      mediaNota,
      mediaFps,
      bom,
      jogavel,
      ruim,
    };
  }, [relatos]);

  const filteredRelatos = useMemo(() => {
    const q = deviceSearch.trim().toLowerCase();
    if (!q) return relatos;

    return relatos.filter((r) => {
      const haystacks = [
        r.modelo,
        r.marca,
        r.chipset || '',
        r.gpu || '',
        r.ram || '',
        r.android_versao || '',
        r.usuario_nome,
        ...(r.tags || []),
      ];
      return haystacks.some((item) => item.toLowerCase().includes(q));
    });
  }, [relatos, deviceSearch]);

  return (
    <section className="rounded-3xl bg-[#1B1924] border border-[#2A2738] p-5 sm:p-6 space-y-5">
      {/* Header + Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#8B5CF6] shrink-0" />
            <h2 className="text-lg font-extrabold text-white tracking-tight">
              Roda no seu celular?
            </h2>
          </div>
          <p className="text-xs text-[#9CA3AF]">
            Relatos reais da comunidade sobre desempenho de {jogoTitulo}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleClickReportButton()}
          className="min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E6] hover:to-[#7C4DFF] text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 shadow-md shadow-[#6366F1]/25 active:scale-[0.98] transition-all shrink-0"
        >
          <MessageSquarePlus className="w-4 h-4 shrink-0" />
          <span>Relatar meu aparelho</span>
        </button>
      </div>

      {/* Logged-in account bar */}
      {currentUser && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#0F0E13] border border-[#2A2738] px-3.5 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <ReportAvatar
              name={getUserDisplayName(currentUser)}
              avatarUrl={getUserAvatarUrl(currentUser)}
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                Conectado como {getUserDisplayName(currentUser)}
              </p>
              {currentUser.email && (
                <p className="text-[11px] text-[#9CA3AF] truncate">
                  {currentUser.email}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="min-h-[36px] px-2.5 rounded-lg text-xs font-medium text-[#9CA3AF] hover:text-white hover:bg-[#1B1924] inline-flex items-center gap-1.5 transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      )}

      {submitSuccess && (
        <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-2.5 text-xs font-medium text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>Relato enviado com sucesso! Obrigado por ajudar a comunidade.</span>
        </div>
      )}

      {/* Summary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-2xl bg-[#0F0E13] border border-[#2A2738] p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-[#9CA3AF]">Nota geral</p>
          <p className="text-xl font-extrabold text-white font-mono-nums">
            {summary.mediaNota}{' '}
            <span className="text-xs font-semibold text-[#9CA3AF]">de 5</span>
          </p>
          <p className="text-[11px] text-[#9CA3AF] font-mono-nums">
            {summary.total} {summary.total === 1 ? 'relato' : 'relatos'}
          </p>
        </div>

        <div className="rounded-2xl bg-[#0F0E13] border border-[#2A2738] p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-[#9CA3AF]">Média de FPS</p>
          <p className="text-xl font-extrabold text-white font-mono-nums">
            {summary.mediaFps !== null ? `${summary.mediaFps}` : '—'}{' '}
            {summary.mediaFps !== null && (
              <span className="text-xs font-semibold text-[#8B5CF6]">FPS</span>
            )}
          </p>
          <p className="text-[11px] text-[#9CA3AF]">Entre relatos com FPS</p>
        </div>

        <div className="col-span-2 rounded-2xl bg-[#0F0E13] border border-[#2A2738] p-3.5 flex flex-col justify-between gap-2">
          <p className="text-[11px] font-medium text-[#9CA3AF]">
            Distribuição dos relatos
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-2 text-center">
              <p className="text-base font-extrabold text-emerald-300 font-mono-nums">
                {summary.bom}
              </p>
              <p className="text-[11px] font-medium text-emerald-300/90">Bom</p>
            </div>
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-2.5 py-2 text-center">
              <p className="text-base font-extrabold text-amber-300 font-mono-nums">
                {summary.jogavel}
              </p>
              <p className="text-[11px] font-medium text-amber-300/90">
                Jogável
              </p>
            </div>
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 px-2.5 py-2 text-center">
              <p className="text-base font-extrabold text-rose-300 font-mono-nums">
                {summary.ruim}
              </p>
              <p className="text-[11px] font-medium text-rose-300/90">Ruim</p>
            </div>
          </div>
        </div>
      </div>

      {/* Device Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={deviceSearch}
          onChange={(e) => setDeviceSearch(e.target.value)}
          placeholder="Filtrar por aparelho, marca, Snapdragon, Mali, Adreno..."
          aria-label="Filtrar relatos por aparelho"
          className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#0F0E13] border border-[#2A2738] text-xs sm:text-sm text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#6366F1] transition-colors"
        />
        {deviceSearch && (
          <button
            type="button"
            onClick={() => setDeviceSearch('')}
            aria-label="Limpar filtro de aparelho"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Reports List */}
      {loadingRelatos ? (
        <div className="space-y-2.5">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={idx}
              className="h-28 rounded-2xl bg-[#0F0E13] border border-[#2A2738] animate-pulse"
            />
          ))}
        </div>
      ) : loadError ? (
        <div className="rounded-2xl bg-[#0F0E13] border border-[#2A2738] p-5 text-center space-y-2">
          <p className="text-xs text-rose-400">{loadError}</p>
          <button
            type="button"
            onClick={() => void fetchRelatos()}
            className="min-h-[40px] px-4 rounded-xl bg-[#1B1924] border border-[#2A2738] text-xs font-semibold text-white hover:border-[#6366F1]/50"
          >
            Tentar novamente
          </button>
        </div>
      ) : filteredRelatos.length === 0 ? (
        <div className="rounded-2xl bg-[#0F0E13] border border-[#2A2738] p-6 text-center space-y-1.5">
          <p className="text-sm font-bold text-white">
            {relatos.length === 0
              ? 'Ainda não há relatos para este jogo'
              : 'Nenhum aparelho encontrado com esse filtro'}
          </p>
          <p className="text-xs text-[#9CA3AF]">
            {relatos.length === 0
              ? 'Seja o primeiro a testar e compartilhar como este port roda no seu celular.'
              : 'Tente buscar por outro modelo, marca ou processador.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRelatos.map((relato) => {
            const hardwareSpecs = [
              relato.chipset,
              relato.gpu,
              relato.ram,
              relato.android_versao,
            ]
              .map((s) => (typeof s === 'string' ? s.trim() : ''))
              .filter(Boolean);

            const isOwner = currentUser?.id === relato.user_id;

            return (
              <article
                key={relato.id}
                className="rounded-2xl bg-[#0F0E13] border border-[#2A2738] p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ReportAvatar
                      name={relato.usuario_nome}
                      avatarUrl={relato.usuario_avatar}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {relato.usuario_nome}
                      </p>
                      <p className="text-xs text-[#9CA3AF]">
                        {formatRelativeTime(relato.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-bold font-mono-nums ${getRatingStyles(
                        relato.nota
                      )}`}
                    >
                      {relato.nota}/5 · {RATING_LABELS[relato.nota] || 'Relato'}
                    </span>

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteOwnReport(relato.id)}
                        aria-label="Excluir meu relato"
                        title="Excluir meu relato"
                        className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg text-[#9CA3AF] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {relato.modelo}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#1B1924] border border-[#2A2738] text-[11px] font-semibold text-[#A5B4FC]">
                      {relato.marca}
                    </span>
                    {typeof relato.fps === 'number' && relato.fps > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#6366F1]/15 border border-[#6366F1]/35 text-[11px] font-bold font-mono-nums text-[#C4B5FD]">
                        <Gauge className="w-3 h-3" />
                        {relato.fps} FPS
                      </span>
                    )}
                  </div>

                  {hardwareSpecs.length > 0 && (
                    <p className="text-xs text-[#9CA3AF] leading-relaxed">
                      {hardwareSpecs.join(' · ')}
                    </p>
                  )}
                </div>

                {Array.isArray(relato.tags) && relato.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {relato.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#1B1924] border border-[#2A2738] text-[11px] font-medium text-[#D1D5DB]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Modal 1: Google OAuth Prompt */}
      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAuthModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#1B1924] border border-[#2A2738] p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-white">
                  Entrar com Google
                </h3>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Faça login com sua conta Google para publicar como este jogo roda no seu aparelho.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                aria-label="Fechar login"
                className="min-w-[36px] min-h-[36px] -mt-1 -mr-1 flex items-center justify-center rounded-xl text-[#9CA3AF] hover:text-white hover:bg-[#2A2738]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {authError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/25 rounded-xl px-3 py-2">
                {authError}
              </p>
            )}

            <div className="space-y-2.5">
              <button
                type="button"
                disabled={authLoading}
                onClick={() => void handleGoogleSignIn()}
                className="w-full min-h-[48px] px-4 rounded-xl bg-white hover:bg-gray-100 disabled:opacity-60 text-[#0F0E13] text-sm font-bold inline-flex items-center justify-center gap-2.5 transition-colors"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                <span>
                  {authLoading ? 'Redirecionando...' : 'Entrar com Google'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="w-full min-h-[44px] rounded-xl bg-[#0F0E13] border border-[#2A2738] text-xs font-semibold text-[#9CA3AF] hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: "Como rodou no seu aparelho?" */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => !submitting && setShowReportModal(false)}
        >
          <form
            onSubmit={handleSubmitReport}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#1B1924] border border-[#2A2738] p-5 sm:p-6 space-y-5 shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-white">
                  Como rodou no seu aparelho?
                </h3>
                <p className="text-xs text-[#9CA3AF] mt-0.5 truncate">
                  {jogoTitulo}
                </p>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowReportModal(false)}
                aria-label="Fechar formulário de relato"
                className="min-w-[40px] min-h-[40px] -mt-1 -mr-1 flex items-center justify-center rounded-xl text-[#9CA3AF] hover:text-white hover:bg-[#2A2738]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Top Card: Detected Hardware */}
            <div className="rounded-2xl bg-[#0F0E13] border border-[#2A2738] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                  <span className="text-xs font-bold text-white">
                    {detectingDevice
                      ? 'Detectando seu aparelho...'
                      : 'Aparelho detectado'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingSpecs((prev) => !prev)}
                  className="min-h-[34px] px-2.5 rounded-lg bg-[#1B1924] border border-[#2A2738] hover:border-[#6366F1]/50 text-xs font-semibold text-[#A5B4FC] inline-flex items-center gap-1.5 transition-colors"
                >
                  {editingSpecs ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Concluir</span>
                    </>
                  ) : (
                    <>
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </>
                  )}
                </button>
              </div>

              {!editingSpecs ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-[#9CA3AF]">Modelo: </span>
                    <span className="font-semibold text-white">
                      {modelo || 'Não detectado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF]">Chipset: </span>
                    <span className="font-semibold text-white">
                      {chipset || 'Não detectado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF]">GPU: </span>
                    <span className="font-semibold text-white">
                      {gpu || 'Não detectada'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#9CA3AF]">RAM: </span>
                    <span className="font-semibold text-white">
                      {ram || 'Não detectada'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#9CA3AF]">Android: </span>
                    <span className="font-semibold text-white">
                      {androidVersao || 'Não detectado'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <label className="space-y-1">
                    <span className="text-[11px] font-medium text-[#9CA3AF]">
                      Modelo *
                    </span>
                    <input
                      type="text"
                      value={modelo}
                      onChange={(e) => {
                        const val = e.target.value;
                        setModelo(val);
                        if (!marca) {
                          const inferred = inferBrandFromModel(val);
                          if (inferred) setMarca(inferred);
                        }
                      }}
                      placeholder="Ex: Poco F5, Galaxy S23"
                      className="w-full h-10 px-3 rounded-xl bg-[#1B1924] border border-[#2A2738] text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1]"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[11px] font-medium text-[#9CA3AF]">
                      Chipset / Processador
                    </span>
                    <input
                      type="text"
                      value={chipset}
                      onChange={(e) => setChipset(e.target.value)}
                      placeholder="Ex: Snapdragon 7+ Gen 2"
                      className="w-full h-10 px-3 rounded-xl bg-[#1B1924] border border-[#2A2738] text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1]"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[11px] font-medium text-[#9CA3AF]">
                      GPU
                    </span>
                    <input
                      type="text"
                      value={gpu}
                      onChange={(e) => setGpu(e.target.value)}
                      placeholder="Ex: Adreno 725"
                      className="w-full h-10 px-3 rounded-xl bg-[#1B1924] border border-[#2A2738] text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1]"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[11px] font-medium text-[#9CA3AF]">
                      Memória RAM
                    </span>
                    <input
                      type="text"
                      value={ram}
                      onChange={(e) => setRam(e.target.value)}
                      placeholder="Ex: 8 GB, 12 GB"
                      className="w-full h-10 px-3 rounded-xl bg-[#1B1924] border border-[#2A2738] text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1]"
                    />
                  </label>

                  <label className="sm:col-span-2 space-y-1">
                    <span className="text-[11px] font-medium text-[#9CA3AF]">
                      Versão do Android
                    </span>
                    <input
                      type="text"
                      value={androidVersao}
                      onChange={(e) => setAndroidVersao(e.target.value)}
                      placeholder="Ex: Android 14"
                      className="w-full h-10 px-3 rounded-xl bg-[#1B1924] border border-[#2A2738] text-xs text-white placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1]"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Brand Pills */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white">
                  Marca do aparelho
                </label>
                {marca && (
                  <span className="text-[11px] font-semibold text-[#A5B4FC]">
                    {marca}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {BRAND_OPTIONS.map((brand) => {
                  const active = marca === brand;
                  return (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => setMarca(brand)}
                      className={`min-h-[36px] px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-[#6366F1] border-[#8B5CF6] text-white shadow-sm shadow-[#6366F1]/30'
                          : 'bg-[#0F0E13] border-[#2A2738] text-[#D1D5DB] hover:border-[#6366F1]/50'
                      }`}
                    >
                      {brand}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FPS Pills (Optional) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white">
                  FPS{' '}
                  <span className="font-normal text-[#9CA3AF]">(opcional)</span>
                </label>
                {fps !== null && (
                  <span className="text-[11px] font-bold font-mono-nums text-[#A5B4FC]">
                    {fps} FPS
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {FPS_OPTIONS.map((value) => {
                  const active = fps === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFps(active ? null : value)}
                      className={`min-h-[36px] px-3 py-1.5 rounded-full border text-xs font-semibold font-mono-nums transition-colors ${
                        active
                          ? 'bg-[#6366F1] border-[#8B5CF6] text-white shadow-sm shadow-[#6366F1]/30'
                          : 'bg-[#0F0E13] border-[#2A2738] text-[#D1D5DB] hover:border-[#6366F1]/50'
                      }`}
                    >
                      {value} FPS
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rating Slider 1 to 5 */}
            <div className="space-y-2.5 rounded-2xl bg-[#0F0E13] border border-[#2A2738] p-4">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="nota-slider"
                  className="text-xs font-bold text-white"
                >
                  Como rodou
                </label>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-lg border text-xs font-bold font-mono-nums ${getRatingStyles(
                    nota
                  )}`}
                >
                  {nota}/5 · {RATING_LABELS[nota]}
                </span>
              </div>

              <input
                id="nota-slider"
                type="range"
                min={1}
                max={5}
                step={1}
                value={nota}
                onChange={(e) => setNota(Number(e.target.value))}
                className="w-full accent-[#8B5CF6] cursor-pointer h-2 bg-[#1B1924] rounded-lg"
              />

              <div className="flex items-center justify-between text-[11px] text-[#9CA3AF]">
                <button
                  type="button"
                  onClick={() => setNota(1)}
                  className="hover:text-white transition-colors"
                >
                  1 · Não roda
                </button>
                <div className="flex items-center gap-2 font-mono-nums">
                  {[2, 3, 4].map((stepVal) => (
                    <button
                      key={stepVal}
                      type="button"
                      onClick={() => setNota(stepVal)}
                      className={`w-6 h-6 rounded-md text-xs font-semibold transition-colors ${
                        nota === stepVal
                          ? 'bg-[#6366F1] text-white'
                          : 'text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      {stepVal}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setNota(5)}
                  className="hover:text-white transition-colors"
                >
                  5 · Perfeito
                </button>
              </div>
            </div>

            {/* Multi-select Observation Tags (max 6) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white">
                  O que você notou?{' '}
                  <span className="font-normal text-[#9CA3AF]">
                    (opcional, até {MAX_TAGS})
                  </span>
                </label>
                <span className="text-[11px] font-mono-nums text-[#9CA3AF]">
                  {selectedTags.length}/{MAX_TAGS}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((tag) => {
                  const active = selectedTags.includes(tag);
                  const reachedLimit = !active && selectedTags.length >= MAX_TAGS;
                  return (
                    <button
                      key={tag}
                      type="button"
                      disabled={reachedLimit}
                      onClick={() => handleToggleTag(tag)}
                      className={`min-h-[36px] px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
                        active
                          ? 'bg-[#6366F1] border-[#8B5CF6] text-white shadow-sm shadow-[#6366F1]/30'
                          : reachedLimit
                          ? 'bg-[#0F0E13]/50 border-[#2A2738]/60 text-[#6B7280] cursor-not-allowed'
                          : 'bg-[#0F0E13] border-[#2A2738] text-[#D1D5DB] hover:border-[#6366F1]/50'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {submitError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/25 rounded-xl px-3 py-2">
                {submitError}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] px-5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E6] hover:to-[#7C4DFF] disabled:opacity-60 text-white text-sm font-bold shadow-lg shadow-[#6366F1]/30 active:scale-[0.99] transition-all"
            >
              {submitting ? 'Enviando relato...' : 'Enviar relato'}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
