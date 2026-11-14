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
import { usePreferences } from '../context/PreferencesContext';
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
  '60 FPS cravados',
  '30 FPS jogável',
  'Engasgos leves',
  'Quedas bruscas de FPS',
  'Fecha sozinho (Crash)',
  'Tela preta ao abrir',
  'Falhas gráficas / Texturas',
  'Sem sombras / Iluminação',
  'Problemas de áudio',
  'Áudio estourado / Sem som',
  'Esquenta muito',
  'Gasta muita bateria',
  'Carregamento demorado',
  'Precisa de patch / fix',
  'Funciona com controle',
  'Controle não reconhecido',
  'Toque funciona bem',
  'Botões na tela ruins',
  'Tradução PT-BR funciona',
  'Save funciona normal',
  'Bug no save',
  'Sem internet (Offline)',
  'Precisa de internet',
  'Roda bem em celular fraco',
  'Exige celular potente',
  'Resolução baixa / Borrado',
  'Tela esticada / Corte',
  'Sem bugs até agora',
  'Zerei o jogo nesse port',
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
    return 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
  }
  if (nota === 3) {
    return 'bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/30';
  }
  return 'bg-rose-500/12 text-rose-700 dark:text-rose-300 border-rose-500/30';
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
        className="w-10 h-10 rounded-full object-cover border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] shrink-0"
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] purple:from-[#7E22CE] purple:to-[#C026D3] text-white font-bold text-sm flex items-center justify-center shrink-0 border border-[#8B5CF6]/40 purple:border-[#C084FC]/50">
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
  const { t } = usePreferences();
  const [relatos, setRelatos] = useState<RelatoDesempenho[]>([]);
  const [loadingRelatos, setLoadingRelatos] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deviceSearch, setDeviceSearch] = useState('');

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [showReportModal, setShowReportModal] = useState(false);
  const [editingRelatoId, setEditingRelatoId] = useState<string | null>(null);
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
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(
    null
  );

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
    setEditingRelatoId(null);
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

  const handleEditOwnReport = (relato: RelatoDesempenho) => {
    setEditingRelatoId(relato.id);
    setSubmitError(null);
    setDetectingDevice(false);
    setEditingSpecs(false);
    setMarca(relato.marca || '');
    setModelo(relato.modelo || '');
    setChipset(relato.chipset || '');
    setGpu(relato.gpu || '');
    setRam(relato.ram || '');
    setAndroidVersao(relato.android_versao || '');
    setFps(typeof relato.fps === 'number' ? relato.fps : null);
    setNota(relato.nota || 4);
    setSelectedTags(Array.isArray(relato.tags) ? relato.tags : []);
    setShowReportModal(true);
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

      if (editingRelatoId) {
        const { data, error } = await communitySupabase
          .from('relatos_desempenho')
          .update(payload)
          .eq('id', editingRelatoId)
          .eq('user_id', currentUser.id)
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        if (data) {
          const updated = data as RelatoDesempenho;
          setRelatos((prev) =>
            prev.map((item) => (item.id === editingRelatoId ? updated : item))
          );
        } else {
          await fetchRelatos();
        }

        setEditingRelatoId(null);
        setShowReportModal(false);
        setSubmitSuccessMessage(t.community.updateSuccess);
        setTimeout(() => setSubmitSuccessMessage(null), 3500);
      } else {
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
        setSubmitSuccessMessage(t.community.reportSuccess);
        setTimeout(() => setSubmitSuccessMessage(null), 3500);
      }
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
    <section className="rounded-3xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-5 sm:p-6 space-y-5">
      {/* Header + Primary CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC] shrink-0" />
            <h2 className="text-lg font-extrabold text-[#111827] dark:text-white tracking-tight">
              {t.community.sectionTitle}
            </h2>
          </div>
          <p className="text-xs text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
            {t.community.sectionSubtitle} {jogoTitulo}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleClickReportButton()}
          className="min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E6] hover:to-[#7C4DFF] purple:from-[#7E22CE] purple:to-[#C026D3] purple:hover:from-[#6B21A8] purple:hover:to-[#A21CAF] text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 shadow-md shadow-[#6366F1]/25 purple:shadow-[#9333EA]/30 active:scale-[0.98] transition-all shrink-0"
        >
          <MessageSquarePlus className="w-4 h-4 shrink-0" />
          <span>{t.community.reportDevice}</span>
        </button>
      </div>

      {/* Logged-in account bar */}
      {currentUser && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] px-3.5 py-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <ReportAvatar
              name={getUserDisplayName(currentUser)}
              avatarUrl={getUserAvatarUrl(currentUser)}
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#111827] dark:text-white truncate">
                {t.community.connectedAs} {getUserDisplayName(currentUser)}
              </p>
              {currentUser.email && (
                <p className="text-[11px] text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] truncate">
                  {currentUser.email}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="min-h-[36px] px-2.5 rounded-lg text-xs font-medium text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] hover:text-[#111827] dark:hover:text-white hover:bg-white dark:hover:bg-[#1B1924] purple:hover:bg-[#20143A] inline-flex items-center gap-1.5 transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t.community.signOut}</span>
          </button>
        </div>
      )}

      {submitSuccessMessage && (
        <div className="rounded-xl bg-emerald-500/12 border border-emerald-500/30 px-3.5 py-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{submitSuccessMessage}</span>
        </div>
      )}

      {/* Summary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-2xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
            {t.community.overallRating}
          </p>
          <p className="text-xl font-extrabold text-[#111827] dark:text-white font-mono-nums">
            {summary.mediaNota}{' '}
            <span className="text-xs font-semibold text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
              {t.community.ofFive}
            </span>
          </p>
          <p className="text-[11px] text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] font-mono-nums">
            {summary.total}{' '}
            {summary.total === 1
              ? t.community.reportSingular
              : t.community.reportPlural}
          </p>
        </div>

        <div className="rounded-2xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-3.5 space-y-1">
          <p className="text-[11px] font-medium text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
            {t.community.avgFps}
          </p>
          <p className="text-xl font-extrabold text-[#111827] dark:text-white font-mono-nums">
            {summary.mediaFps !== null ? `${summary.mediaFps}` : '—'}{' '}
            {summary.mediaFps !== null && (
              <span className="text-xs font-semibold text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC]">
                FPS
              </span>
            )}
          </p>
          <p className="text-[11px] text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
            {t.community.amongFpsReports}
          </p>
        </div>

        <div className="col-span-2 rounded-2xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-3.5 flex flex-col justify-between gap-2">
          <p className="text-[11px] font-medium text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
            {t.community.distribution}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-2 text-center">
              <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-300 font-mono-nums">
                {summary.bom}
              </p>
              <p className="text-[11px] font-medium text-emerald-700/90 dark:text-emerald-300/90">
                {t.community.good}
              </p>
            </div>
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-2.5 py-2 text-center">
              <p className="text-base font-extrabold text-amber-700 dark:text-amber-300 font-mono-nums">
                {summary.jogavel}
              </p>
              <p className="text-[11px] font-medium text-amber-700/90 dark:text-amber-300/90">
                {t.community.playable}
              </p>
            </div>
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 px-2.5 py-2 text-center">
              <p className="text-base font-extrabold text-rose-700 dark:text-rose-300 font-mono-nums">
                {summary.ruim}
              </p>
              <p className="text-[11px] font-medium text-rose-700/90 dark:text-rose-300/90">
                {t.community.bad}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Device Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={deviceSearch}
          onChange={(e) => setDeviceSearch(e.target.value)}
          placeholder={t.community.searchPlaceholder}
          aria-label={t.community.searchPlaceholder}
          className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] text-xs sm:text-sm text-[#111827] dark:text-white placeholder-[#525866] dark:placeholder-[#9CA3AF] purple:placeholder-[#C4B5FD]/75 focus:outline-none focus:border-[#6366F1] purple:focus:border-[#C084FC] transition-colors"
        />
        {deviceSearch && (
          <button
            type="button"
            onClick={() => setDeviceSearch('')}
            aria-label="Limpar filtro de aparelho"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] hover:text-[#111827] dark:hover:text-white"
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
              className="h-28 rounded-2xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] animate-pulse"
            />
          ))}
        </div>
      ) : loadError ? (
        <div className="rounded-2xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-5 text-center space-y-2">
          <p className="text-xs text-rose-500 dark:text-rose-400">{loadError}</p>
          <button
            type="button"
            onClick={() => void fetchRelatos()}
            className="min-h-[40px] px-4 rounded-xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] text-xs font-semibold text-[#111827] dark:text-white hover:border-[#6366F1]/50 purple:hover:border-[#A855F7]/60"
          >
            {t.community.retry}
          </button>
        </div>
      ) : filteredRelatos.length === 0 ? (
        <div className="rounded-2xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-6 text-center space-y-1.5">
          <p className="text-sm font-bold text-[#111827] dark:text-white">
            {relatos.length === 0
              ? t.community.emptyTitle
              : t.community.emptyFilterTitle}
          </p>
          <p className="text-xs text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
            {relatos.length === 0
              ? t.community.emptyDesc
              : t.community.emptyFilterDesc}
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
                className="rounded-2xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ReportAvatar
                      name={relato.usuario_nome}
                      avatarUrl={relato.usuario_avatar}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#111827] dark:text-white truncate">
                        {relato.usuario_nome}
                      </p>
                      <p className="text-xs text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
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
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditOwnReport(relato)}
                          aria-label={t.community.edit}
                          title={t.community.edit}
                          className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] hover:text-[#6366F1] dark:hover:text-[#A5B4FC] purple:hover:text-[#D8B4FE] hover:bg-[#6366F1]/12 purple:hover:bg-[#9333EA]/20 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteOwnReport(relato.id)}
                          aria-label="Excluir meu relato"
                          title="Excluir meu relato"
                          className="min-w-[34px] min-h-[34px] flex items-center justify-center rounded-lg text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-[#111827] dark:text-white">
                      {relato.modelo}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] text-[11px] font-semibold text-[#4F46E5] dark:text-[#A5B4FC] purple:text-[#D8B4FE]">
                      {relato.marca}
                    </span>
                    {typeof relato.fps === 'number' && relato.fps > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#6366F1]/12 purple:bg-[#9333EA]/25 border border-[#6366F1]/35 purple:border-[#C084FC]/45 text-[11px] font-bold font-mono-nums text-[#4F46E5] dark:text-[#C4B5FD] purple:text-[#E9D5FF]">
                        <Gauge className="w-3 h-3" />
                        {relato.fps} FPS
                      </span>
                    )}
                  </div>

                  {hardwareSpecs.length > 0 && (
                    <p className="text-xs text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] leading-relaxed">
                      {hardwareSpecs.join(' · ')}
                    </p>
                  )}
                </div>

                {Array.isArray(relato.tags) && relato.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {relato.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2.5 py-1 rounded-full bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] text-[11px] font-medium text-[#374151] dark:text-[#D1D5DB] purple:text-[#DDD6FE]"
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
          className="fixed inset-0 z-50 bg-black/75 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAuthModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-[#111827] dark:text-white">
                  {t.community.authTitle}
                </h3>
                <p className="text-xs text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] leading-relaxed">
                  {t.community.authDesc}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                aria-label="Fechar login"
                className="min-w-[36px] min-h-[36px] -mt-1 -mr-1 flex items-center justify-center rounded-xl text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] hover:text-[#111827] dark:hover:text-white hover:bg-[#F4F5F9] dark:hover:bg-[#2A2738] purple:hover:bg-[#170E2B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {authError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/25 rounded-xl px-3 py-2">
                {authError}
              </p>
            )}

            <div className="space-y-2.5">
              <button
                type="button"
                disabled={authLoading}
                onClick={() => void handleGoogleSignIn()}
                className="w-full min-h-[48px] px-4 rounded-xl bg-[#F4F5F9] dark:bg-white hover:bg-[#E8EAF2] dark:hover:bg-gray-100 border border-[#E2E4EC] dark:border-transparent disabled:opacity-60 text-[#111827] dark:text-[#0F0E13] text-sm font-bold inline-flex items-center justify-center gap-2.5 transition-colors"
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
                  {authLoading ? t.settings.redirecting : t.community.signInGoogle}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="w-full min-h-[44px] rounded-xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] text-xs font-semibold text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] hover:text-[#111827] dark:hover:text-white transition-colors"
              >
                {t.community.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: "Como rodou no seu aparelho?" */}
      {showReportModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 dark:bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => !submitting && setShowReportModal(false)}
        >
          <form
            onSubmit={handleSubmitReport}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-5 sm:p-6 space-y-5 shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-[#111827] dark:text-white">
                  {t.community.modalTitle}
                </h3>
                <p className="text-xs text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] mt-0.5 truncate">
                  {jogoTitulo}
                </p>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowReportModal(false)}
                aria-label="Fechar formulário de relato"
                className="min-w-[40px] min-h-[40px] -mt-1 -mr-1 flex items-center justify-center rounded-xl text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] hover:text-[#111827] dark:hover:text-white hover:bg-[#F4F5F9] dark:hover:bg-[#2A2738] purple:hover:bg-[#170E2B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Top Card: Detected Hardware */}
            <div className="rounded-2xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC] shrink-0" />
                  <span className="text-xs font-bold text-[#111827] dark:text-white">
                    {detectingDevice
                      ? t.community.detectingDevice
                      : t.community.detectedDevice}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingSpecs((prev) => !prev)}
                  className="min-h-[34px] px-2.5 rounded-lg bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] hover:border-[#6366F1]/50 purple:hover:border-[#A855F7]/60 text-xs font-semibold text-[#4F46E5] dark:text-[#A5B4FC] purple:text-[#D8B4FE] inline-flex items-center gap-1.5 transition-colors"
                >
                  {editingSpecs ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{t.community.done}</span>
                    </>
                  ) : (
                    <>
                      <Pencil className="w-3.5 h-3.5" />
                      <span>{t.community.edit}</span>
                    </>
                  )}
                </button>
              </div>

              {!editingSpecs ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <span className="text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
                      {t.community.model}:{' '}
                    </span>
                    <span className="font-semibold text-[#111827] dark:text-white">
                      {modelo || t.community.notDetected}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
                      {t.community.chipset}:{' '}
                    </span>
                    <span className="font-semibold text-[#111827] dark:text-white">
                      {chipset || t.community.notDetected}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
                      {t.community.gpu}:{' '}
                    </span>
                    <span className="font-semibold text-[#111827] dark:text-white">
                      {gpu || t.community.notDetectedFem}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
                      {t.community.ram}:{' '}
                    </span>
                    <span className="font-semibold text-[#111827] dark:text-white">
                      {ram || t.community.notDetectedFem}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
                      {t.community.android}:{' '}
                    </span>
                    <span className="font-semibold text-[#111827] dark:text-white">
                      {androidVersao || t.community.notDetected}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <label className="space-y-1">
                    <span className="text-[11px] font-medium text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
                      {t.community.modelFieldLabel}
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
                      placeholder="Ex: OPPO A5 4G (CPH2727)"
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] text-xs text-[#111827] dark:text-white placeholder-[#9CA3AF] dark:placeholder-[#6B7280] purple:placeholder-[#C4B5FD]/60 focus:outline-none focus:border-[#6366F1] purple:focus:border-[#C084FC]"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[11px] font-medium text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
                      Chipset / Processador
                    </span>
                    <input
                      type="text"
                      value={chipset}
                      onChange={(e) => setChipset(e.target.value)}
                      placeholder="Ex: Snapdragon 7+ Gen 2"
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] text-xs text-[#111827] dark:text-white placeholder-[#9CA3AF] dark:placeholder-[#6B7280] purple:placeholder-[#C4B5FD]/60 focus:outline-none focus:border-[#6366F1] purple:focus:border-[#C084FC]"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[11px] font-medium text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
                      GPU
                    </span>
                    <input
                      type="text"
                      value={gpu}
                      onChange={(e) => setGpu(e.target.value)}
                      placeholder="Ex: Adreno 725"
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] text-xs text-[#111827] dark:text-white placeholder-[#9CA3AF] dark:placeholder-[#6B7280] purple:placeholder-[#C4B5FD]/60 focus:outline-none focus:border-[#6366F1] purple:focus:border-[#C084FC]"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-[11px] font-medium text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
                      Memória RAM
                    </span>
                    <input
                      type="text"
                      value={ram}
                      onChange={(e) => setRam(e.target.value)}
                      placeholder="Ex: 8 GB, 12 GB"
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] text-xs text-[#111827] dark:text-white placeholder-[#9CA3AF] dark:placeholder-[#6B7280] purple:placeholder-[#C4B5FD]/60 focus:outline-none focus:border-[#6366F1] purple:focus:border-[#C084FC]"
                    />
                  </label>

                  <label className="sm:col-span-2 space-y-1">
                    <span className="text-[11px] font-medium text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
                      Versão do Android
                    </span>
                    <input
                      type="text"
                      value={androidVersao}
                      onChange={(e) => setAndroidVersao(e.target.value)}
                      placeholder="Ex: Android 14"
                      className="w-full h-10 px-3 rounded-xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] text-xs text-[#111827] dark:text-white placeholder-[#9CA3AF] dark:placeholder-[#6B7280] purple:placeholder-[#C4B5FD]/60 focus:outline-none focus:border-[#6366F1] purple:focus:border-[#C084FC]"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Brand Pills */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#111827] dark:text-white">
                  {t.community.brandLabel}
                </label>
                {marca && (
                  <span className="text-[11px] font-semibold text-[#4F46E5] dark:text-[#A5B4FC] purple:text-[#D8B4FE]">
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
                          ? 'bg-[#6366F1] border-[#8B5CF6] purple:bg-[#9333EA] purple:border-[#C084FC] text-white shadow-sm shadow-[#6366F1]/30 purple:shadow-[#9333EA]/30'
                          : 'bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] text-[#374151] dark:text-[#D1D5DB] purple:text-[#DDD6FE] hover:border-[#6366F1]/50 purple:hover:border-[#A855F7]/60'
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
                <label className="text-xs font-bold text-[#111827] dark:text-white">
                  {t.community.fpsLabel}{' '}
                  <span className="font-normal text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
                    {t.community.optional}
                  </span>
                </label>
                {fps !== null && (
                  <span className="text-[11px] font-bold font-mono-nums text-[#4F46E5] dark:text-[#A5B4FC] purple:text-[#D8B4FE]">
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
                          ? 'bg-[#6366F1] border-[#8B5CF6] purple:bg-[#9333EA] purple:border-[#C084FC] text-white shadow-sm shadow-[#6366F1]/30 purple:shadow-[#9333EA]/30'
                          : 'bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] text-[#374151] dark:text-[#D1D5DB] purple:text-[#DDD6FE] hover:border-[#6366F1]/50 purple:hover:border-[#A855F7]/60'
                      }`}
                    >
                      {value} FPS
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rating Slider 1 to 5 */}
            <div className="space-y-2.5 rounded-2xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-4">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="nota-slider"
                  className="text-xs font-bold text-[#111827] dark:text-white"
                >
                  {t.community.howItRan}
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
                className="w-full accent-[#6366F1] dark:accent-[#8B5CF6] purple:accent-[#C084FC] cursor-pointer h-2 bg-white dark:bg-[#1B1924] purple:bg-[#20143A] rounded-lg"
              />

              <div className="flex items-center justify-between text-[11px] text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
                <button
                  type="button"
                  onClick={() => setNota(1)}
                  className="hover:text-[#111827] dark:hover:text-white transition-colors"
                >
                  1 · {t.community.doesNotRun}
                </button>
                <div className="flex items-center gap-2 font-mono-nums">
                  {[2, 3, 4].map((stepVal) => (
                    <button
                      key={stepVal}
                      type="button"
                      onClick={() => setNota(stepVal)}
                      className={`w-6 h-6 rounded-md text-xs font-semibold transition-colors ${
                        nota === stepVal
                          ? 'bg-[#6366F1] purple:bg-[#9333EA] text-white'
                          : 'text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] hover:text-[#111827] dark:hover:text-white'
                      }`}
                    >
                      {stepVal}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setNota(5)}
                  className="hover:text-[#111827] dark:hover:text-white transition-colors"
                >
                  5 · {t.community.perfect}
                </button>
              </div>
            </div>

            {/* Multi-select Observation Tags (max 6) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#111827] dark:text-white">
                  {t.community.whatNoticed}{' '}
                  <span className="font-normal text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
                    {t.community.upToSix}
                  </span>
                </label>
                <span className="text-[11px] font-mono-nums text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD]">
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
                          ? 'bg-[#6366F1] border-[#8B5CF6] purple:bg-[#9333EA] purple:border-[#C084FC] text-white shadow-sm shadow-[#6366F1]/30 purple:shadow-[#9333EA]/30'
                          : reachedLimit
                          ? 'bg-[#F4F5F9]/50 dark:bg-[#0F0E13]/50 purple:bg-[#170E2B]/50 border-[#E2E4EC]/60 dark:border-[#2A2738]/60 purple:border-[#392466]/60 text-[#9CA3AF] dark:text-[#6B7280] purple:text-[#C4B5FD]/40 cursor-not-allowed'
                          : 'bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] text-[#374151] dark:text-[#D1D5DB] purple:text-[#DDD6FE] hover:border-[#6366F1]/50 purple:hover:border-[#A855F7]/60'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {submitError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/25 rounded-xl px-3 py-2">
                {submitError}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[48px] px-5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E6] hover:to-[#7C4DFF] purple:from-[#7E22CE] purple:to-[#C026D3] purple:hover:from-[#6B21A8] purple:hover:to-[#A21CAF] disabled:opacity-60 text-white text-sm font-bold shadow-lg shadow-[#6366F1]/30 purple:shadow-[#9333EA]/30 active:scale-[0.99] transition-all"
            >
              {submitting
                ? editingRelatoId
                  ? t.community.savingChanges
                  : t.community.submittingReport
                : editingRelatoId
                ? t.community.saveChanges
                : t.community.submitReport}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
