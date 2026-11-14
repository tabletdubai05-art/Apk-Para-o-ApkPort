import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  Gamepad2,
  Heart,
  History,
  Home,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import {
  FeaturedCard,
  GridGameCard,
  ListGameCard,
} from './components/GameCard';
import { GameDetailsView } from './components/GameDetailsView';
import { ProgressView } from './components/ProgressView';
import { SettingsView } from './components/SettingsView';
import { UpdateModal, type AppUpdateInfo } from './components/UpdateModal';
import { usePreferences } from './context/PreferencesContext';
import {
  communitySupabase,
  handleOAuthCallbackUrl,
  isNativeApp,
  NATIVE_OAUTH_REDIRECT_URL,
  PENDING_REPORT_GAME_KEY,
} from './lib/communitySupabase';
import {
  openP2PIntent,
  restartCleanDownload,
} from './services/downloadEngine';
import type {
  DownloadMethod,
  DownloadTask,
  Jogo,
  JogoArquivo,
  SortOption,
  TabId,
  ViewMode,
} from './types/game';
import {
  clearAllDownloadCache,
  deleteDownloadTask,
  loadAllDownloadTasks,
  saveDownloadTask,
} from './utils/downloadDb';
import {
  buildDownloadTaskId,
  buildP2PDownloadTaskId,
  extractFileNameFromUrl,
  parseCategories,
  parseSizeToBytes,
  sanitizeFolderName,
} from './utils/formatters';
import { APP_VERSION } from './version';

export { APP_VERSION };
export const VERSAO_APP = APP_VERSION;

function isValidHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed.toLowerCase().startsWith('http')) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isRemoteVersionGreater(
  remoteVersion: string,
  currentVersion: string
): boolean {
  const parseParts = (v: string): number[] | null => {
    const cleaned = v.trim().replace(/^v/i, '');
    if (!cleaned) return null;
    const segments = cleaned.split('.');
    const nums = segments.map((seg) => {
      if (!/^\d+$/.test(seg)) return NaN;
      return Number.parseInt(seg, 10);
    });
    if (nums.some((n) => Number.isNaN(n))) return null;
    return nums;
  };

  const remoteParts = parseParts(remoteVersion);
  const currentParts = parseParts(currentVersion);
  if (!remoteParts || !currentParts) return false;

  const maxLen = Math.max(remoteParts.length, currentParts.length);
  for (let i = 0; i < maxLen; i++) {
    const r = remoteParts[i] ?? 0;
    const c = currentParts[i] ?? 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

const SUPABASE_URL = 'https://mfwzkzywxvbbonsshjgh.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1md3prenl3eHZiYm9uc3NoamdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1MjIyMTgsImV4cCI6MjExMDA5ODIxOH0.GC7FJFhSVjKaKJsackBMjLXIf4eLUnY8H2J3kDBbi6M';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FAVORITES_STORAGE_KEY = 'droidport_favorites_v1';
const VIEW_MODE_STORAGE_KEY = 'droidport_view_mode_v1';
const INSTALLED_VERSION_STORAGE_KEY = 'droidport_installed_version_v1';

export default function App() {
  const { t, autoCheckUpdates } = usePreferences();

  const sortLabels: Record<SortOption, string> = {
    recentes: t.catalog.sortRecent,
    nome: t.catalog.sortName,
    tamanho: t.catalog.sortSize,
  };

  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabId>('inicio');
  const [selectedGame, setSelectedGame] = useState<Jogo | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [sortOption, setSortOption] = useState<SortOption>('recentes');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      return saved === 'grade' ? 'grade' : 'lista';
    } catch {
      return 'lista';
    }
  });

  const [openDropdown, setOpenDropdown] = useState<'categoria' | 'ordenar' | null>(
    null
  );
  const filterBarRef = useRef<HTMLDivElement>(null);

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  });

  const [downloads, setDownloads] = useState<Record<string, DownloadTask>>({});

  const [availableUpdate, setAvailableUpdate] = useState<AppUpdateInfo | null>(
    null
  );
  const [communityLoggedIn, setCommunityLoggedIn] = useState(false);
  const [autoOpenReportGameId, setAutoOpenReportGameId] = useState<string | null>(
    null
  );

  // Track second Supabase auth state & Capacitor deep-link callback (droidport://login-callback)
  useEffect(() => {
    let active = true;
    let urlListenerHandle: { remove: () => Promise<void> } | null = null;

    const processNativeCallback = async (url: string) => {
      if (!url.startsWith(NATIVE_OAUTH_REDIRECT_URL)) return;
      try {
        await handleOAuthCallbackUrl(url);
      } catch {
        // Ignore malformed/expired callback URL
      } finally {
        try {
          await Browser.close();
        } catch {
          // Ignore if browser tab is already closed
        }
      }
    };

    if (isNativeApp()) {
      CapacitorApp.getLaunchUrl()
        .then((launch) => {
          if (active && launch?.url) {
            void processNativeCallback(launch.url);
          }
        })
        .catch(() => {
          // Ignore
        });

      CapacitorApp.addListener('appUrlOpen', (event) => {
        if (!active || !event?.url) return;
        void processNativeCallback(event.url);
      })
        .then((handle) => {
          if (!active) {
            void handle.remove();
          } else {
            urlListenerHandle = handle;
          }
        })
        .catch(() => {
          // Ignore
        });
    } else if (typeof window !== 'undefined') {
      const hasOAuthParams =
        window.location.search.includes('code=') ||
        window.location.hash.includes('access_token=') ||
        window.location.hash.includes('error=');

      if (hasOAuthParams) {
        communitySupabase.auth.getSession().finally(() => {
          if (!active) return;
          window.history.replaceState(
            {},
            document.title,
            window.location.origin + window.location.pathname
          );
        });
      }
    }

    communitySupabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setCommunityLoggedIn(Boolean(data.session?.user));
    });

    const { data: authListener } = communitySupabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;
        setCommunityLoggedIn(Boolean(session?.user));
      }
    );

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      if (urlListenerHandle) {
        void urlListenerHandle.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (!communityLoggedIn || jogos.length === 0) return;

    try {
      const pendingGameId = localStorage.getItem(PENDING_REPORT_GAME_KEY);
      if (!pendingGameId) return;

      const matched = jogos.find((j) => String(j.id) === pendingGameId);
      localStorage.removeItem(PENDING_REPORT_GAME_KEY);

      if (matched) {
        setSelectedGame(matched);
        setAutoOpenReportGameId(String(matched.id));
      }
    } catch {
      // Ignore storage errors
    }
  }, [communityLoggedIn, jogos]);

  const checkForUpdatesNow = useCallback(
    async (
      showPromptIfAvailable = true
    ): Promise<'up-to-date' | 'update-available' | 'error'> => {
      try {
        const { data, error: configError } = await supabase
          .from('config')
          .select('*')
          .limit(1);

        if (configError) return 'error';
        if (!data || data.length === 0) return 'up-to-date';

        const row = data[0] as {
          id?: string | number | null;
          versao_atual?: string | number | null;
          link_apk?: string | null;
        };

        const rawRemoteVersion = row.versao_atual;
        const versaoAtual =
          typeof rawRemoteVersion === 'string'
            ? rawRemoteVersion.trim()
            : rawRemoteVersion !== null && rawRemoteVersion !== undefined
            ? String(rawRemoteVersion).trim()
            : '';

        // Se a APP_VERSION do aplicativo instalado for MAIOR que a versão salva no Supabase,
        // sincroniza automaticamente a tabela `config` para igualar à APP_VERSION atual.
        if (!versaoAtual || isRemoteVersionGreater(APP_VERSION, versaoAtual)) {
          try {
            const updateBuilder = supabase
              .from('config')
              .update({ versao_atual: APP_VERSION });

            if (row.id !== undefined && row.id !== null) {
              await updateBuilder.eq('id', row.id);
            } else if (rawRemoteVersion !== undefined && rawRemoteVersion !== null) {
              await updateBuilder.eq('versao_atual', rawRemoteVersion);
            } else if (typeof row.link_apk === 'string' && row.link_apk) {
              await updateBuilder.eq('link_apk', row.link_apk);
            }
          } catch {
            // Ignora silenciosamente caso RLS bloqueie escrita anônima
          }

          try {
            localStorage.setItem(INSTALLED_VERSION_STORAGE_KEY, APP_VERSION);
          } catch {
            // Ignore storage errors
          }

          return 'up-to-date';
        }

        // Se a versão no Supabase for MAIOR que a APP_VERSION instalada, mostra o modal de atualização.
        if (
          isRemoteVersionGreater(versaoAtual, APP_VERSION) &&
          isValidHttpUrl(row.link_apk)
        ) {
          if (showPromptIfAvailable) {
            setAvailableUpdate({
              versaoAtual,
              linkApk: row.link_apk.trim(),
            });
          }
          return 'update-available';
        }

        return 'up-to-date';
      } catch {
        return 'error';
      }
    },
    []
  );

  // Sincroniza versão no Supabase ao iniciar e verifica se há atualização disponível
  useEffect(() => {
    void checkForUpdatesNow(autoCheckUpdates);
  }, [autoCheckUpdates, checkForUpdatesNow]);

  const handleUpdateNow = useCallback(async () => {
    if (!availableUpdate) return;
    const { versaoAtual, linkApk } = availableUpdate;
    try {
      localStorage.setItem(INSTALLED_VERSION_STORAGE_KEY, versaoAtual);
    } catch {
      // Ignore storage quota errors
    }
    setAvailableUpdate(null);
    if (!linkApk) return;
    try {
      await Browser.open({ url: linkApk });
    } catch {
      window.open(linkApk, '_system');
    }
  }, [availableUpdate]);

  // Fetch games from Supabase table `jogos`
  const fetchJogos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from('jogos')
        .select('*');

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setJogos((data as Jogo[]) || []);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar o catálogo de jogos.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchJogos();
  }, [fetchJogos]);

  // Restore persisted downloads from IndexedDB on mount
  useEffect(() => {
    let active = true;
    loadAllDownloadTasks().then((savedTasks) => {
      if (!active || savedTasks.length === 0) return;

      const restored: Record<string, DownloadTask> = {};
      for (const task of savedTasks) {
        const normalizedStatus =
          task.status === 'downloading' ||
          task.status === 'starting' ||
          task.status === 'paused'
            ? 'completed'
            : task.status;

        const updatedTask: DownloadTask = {
          ...task,
          status: normalizedStatus,
          speedBytesPerSec: 0,
          peers: 0,
          initiatedAt: task.initiatedAt ?? task.updatedAt,
        };
        restored[task.taskId] = updatedTask;

        if (normalizedStatus !== task.status) {
          void saveDownloadTask(updatedTask);
        }
      }
      setDownloads(restored);
    });

    return () => {
      active = false;
    };
  }, []);

  // Persist favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // Ignore storage quota issues
    }
  }, [favorites]);

  // Persist view mode
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {
      // Ignore
    }
  }, [viewMode]);

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        filterBarRef.current &&
        !filterBarRef.current.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const toggleFavorite = useCallback((gameId: string) => {
    setFavorites((prev) =>
      prev.includes(gameId)
        ? prev.filter((id) => id !== gameId)
        : [...prev, gameId]
    );
  }, []);

  const handleTaskUpdate = useCallback((task: DownloadTask) => {
    setDownloads((prev) => ({
      ...prev,
      [task.taskId]: task,
    }));
  }, []);

  const createFileTask = useCallback(
    (jogo: Jogo, arquivo: JogoArquivo, index: number): DownloadTask => {
      const gameId = String(jogo.id);
      const taskId = buildDownloadTaskId(gameId, arquivo, index);
      const fallbackBase = sanitizeFolderName(jogo.titulo);
      const fileName = extractFileNameFromUrl(
        arquivo.url || arquivo.torrent_url,
        fallbackBase
      );
      const tamanho = arquivo.tamanho || jogo.tamanho;
      const now = Date.now() + index;

      return {
        taskId,
        gameId,
        titulo: jogo.titulo,
        arquivoNome: arquivo.nome,
        capa_url: jogo.capa_url,
        versao: jogo.versao,
        tamanho,
        torrent_url: arquivo.torrent_url ?? null,
        webseed_url: arquivo.url || null,
        status: 'completed',
        mode: 'system-browser',
        method: 'direct',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: parseSizeToBytes(tamanho),
        speedBytesPerSec: 0,
        peers: 0,
        fileName,
        savedPath: undefined,
        errorMessage: undefined,
        initiatedAt: now,
        updatedAt: now,
      };
    },
    []
  );

  const createP2PTask = useCallback(
    (jogo: Jogo, arquivo: JogoArquivo, index: number): DownloadTask => {
      const gameId = String(jogo.id);
      const taskId = buildP2PDownloadTaskId(gameId, arquivo, index);
      const fallbackBase = sanitizeFolderName(jogo.titulo);
      const fileName = extractFileNameFromUrl(
        arquivo.torrent_url || arquivo.url,
        fallbackBase
      );
      const tamanho = arquivo.tamanho || jogo.tamanho;
      const now = Date.now() + index;

      return {
        taskId,
        gameId,
        titulo: jogo.titulo,
        arquivoNome: arquivo.nome,
        capa_url: jogo.capa_url,
        versao: jogo.versao,
        tamanho,
        torrent_url: arquivo.torrent_url ?? null,
        webseed_url: arquivo.url || null,
        status: 'completed',
        mode: 'p2p-intent',
        method: 'p2p',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: parseSizeToBytes(tamanho),
        speedBytesPerSec: 0,
        peers: 0,
        fileName,
        savedPath: undefined,
        errorMessage: undefined,
        initiatedAt: now,
        updatedAt: now,
      };
    },
    []
  );

  const handleStartFileDownload = useCallback(
    (jogo: Jogo, arquivo: JogoArquivo, index: number) => {
      const task = createFileTask(jogo, arquivo, index);

      setDownloads((prev) => ({
        ...prev,
        [task.taskId]: task,
      }));

      void restartCleanDownload(task, handleTaskUpdate);
    },
    [createFileTask, handleTaskUpdate]
  );

  const handleStartP2PDownload = useCallback(
    (jogo: Jogo, arquivo: JogoArquivo, index: number) => {
      const torrentUrl = arquivo.torrent_url?.trim();
      if (!torrentUrl) return;

      openP2PIntent(torrentUrl);

      const task = createP2PTask(jogo, arquivo, index);
      setDownloads((prev) => ({
        ...prev,
        [task.taskId]: task,
      }));
      void saveDownloadTask(task);
    },
    [createP2PTask]
  );

  const handleDownloadAll = useCallback(
    (jogo: Jogo, arquivos: JogoArquivo[]) => {
      if (arquivos.length === 0) return;

      const tasks = arquivos.map((arquivo, idx) =>
        createFileTask(jogo, arquivo, idx)
      );

      setDownloads((prev) => {
        const next = { ...prev };
        for (const t of tasks) {
          next[t.taskId] = t;
        }
        return next;
      });

      for (const task of tasks) {
        void restartCleanDownload(task, handleTaskUpdate);
      }
    },
    [createFileTask, handleTaskUpdate]
  );

  const handleRetryDownload = useCallback(
    (task: DownloadTask, methodOverride?: DownloadMethod) => {
      const targetMethod: DownloadMethod =
        methodOverride ??
        (task.method === 'p2p' || task.mode === 'p2p-intent' ? 'p2p' : 'direct');

      if (targetMethod === 'p2p') {
        const torrentUrl = task.torrent_url?.trim();
        if (!torrentUrl) return;

        openP2PIntent(torrentUrl);

        const now = Date.now();
        const updatedTask: DownloadTask = {
          ...task,
          status: 'completed',
          mode: 'p2p-intent',
          method: 'p2p',
          initiatedAt: now,
          updatedAt: now,
        };
        setDownloads((prev) => ({
          ...prev,
          [updatedTask.taskId]: updatedTask,
        }));
        void saveDownloadTask(updatedTask);
        return;
      }

      const directTask: DownloadTask = {
        ...task,
        mode: 'system-browser',
        method: 'direct',
      };
      void restartCleanDownload(directTask, handleTaskUpdate);
    },
    [handleTaskUpdate]
  );

  const handleRemoveFinished = useCallback((taskId: string) => {
    void deleteDownloadTask(taskId);
    setDownloads((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  }, []);

  const handleClearCache = useCallback(async () => {
    await clearAllDownloadCache();
    setDownloads({});
  }, []);

  const handleClearFavorites = useCallback(() => {
    setFavorites([]);
    try {
      localStorage.removeItem(FAVORITES_STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  // Build unique list of categories by splitting `categoria` by comma
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    for (const jogo of jogos) {
      for (const cat of parseCategories(jogo.categoria)) {
        set.add(cat);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [jogos]);

  // Featured games (destaque === true) filtered by search query if active
  const featuredGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return jogos.filter((j) => {
      if (j.destaque !== true) return false;
      if (!q) return true;
      return (
        j.titulo.toLowerCase().includes(q) ||
        j.categoria.toLowerCase().includes(q)
      );
    });
  }, [jogos, searchQuery]);

  // Filtered and sorted catalog
  const filteredGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const matched = jogos.filter((jogo) => {
      const matchesSearch =
        !q ||
        jogo.titulo.toLowerCase().includes(q) ||
        jogo.categoria.toLowerCase().includes(q) ||
        (jogo.descricao && jogo.descricao.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (selectedCategory !== 'Todas') {
        const cats = parseCategories(jogo.categoria);
        if (!cats.includes(selectedCategory)) return false;
      }

      return true;
    });

    const sorted = [...matched];
    if (sortOption === 'nome') {
      sorted.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
    } else if (sortOption === 'tamanho') {
      sorted.sort(
        (a, b) => parseSizeToBytes(b.tamanho) - parseSizeToBytes(a.tamanho)
      );
    } else {
      // Mais recentes: sort by created_at desc if available, else id desc
      sorted.sort((a, b) => {
        if (a.created_at && b.created_at) {
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }
        return Number(b.id) - Number(a.id);
      });
    }

    return sorted;
  }, [jogos, searchQuery, selectedCategory, sortOption]);

  const favoriteGames = useMemo(() => {
    return jogos.filter((j) => favorites.includes(String(j.id)));
  }, [jogos, favorites]);

  const downloadList = useMemo(() => {
    return Object.values(downloads).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [downloads]);

  // Game Details View Overlay
  if (selectedGame) {
    const gameId = String(selectedGame.id);
    return (
      <>
        <GameDetailsView
          jogo={selectedGame}
          isFavorite={favorites.includes(gameId)}
          downloads={downloads}
          autoOpenReportModal={autoOpenReportGameId === gameId}
          onConsumeAutoOpenReport={() => setAutoOpenReportGameId(null)}
          onBack={() => {
            setSelectedGame(null);
            setAutoOpenReportGameId(null);
          }}
          onToggleFavorite={toggleFavorite}
          onStartFileDownload={handleStartFileDownload}
          onStartP2PDownload={handleStartP2PDownload}
          onDownloadAll={handleDownloadAll}
          onRetryDownload={handleRetryDownload}
        />
        {availableUpdate && (
          <UpdateModal
            update={availableUpdate}
            onUpdateNow={handleUpdateNow}
            onDismiss={() => setAvailableUpdate(null)}
          />
        )}
      </>
    );
  }

  const renderGameList = (items: Jogo[], emptyMessage: string) => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-28 rounded-2xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] animate-pulse"
            />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-2xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-6 text-center space-y-3">
          <p className="text-sm text-rose-500 dark:text-rose-400">{error}</p>
          <button
            type="button"
            onClick={() => void fetchJogos()}
            className="min-h-[44px] px-5 rounded-xl bg-[#6366F1] hover:bg-[#5558E6] purple:bg-[#9333EA] purple:hover:bg-[#7E22CE] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t.catalog.reloadCatalog}</span>
          </button>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="rounded-2xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] p-8 text-center space-y-2">
          <Gamepad2 className="w-8 h-8 text-[#6366F1]/70 purple:text-[#C084FC]/80 mx-auto" />
          <p className="text-sm font-medium text-[#111827] dark:text-white">
            {emptyMessage}
          </p>
          {(searchQuery || selectedCategory !== 'Todas') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('Todas');
              }}
              className="mt-2 min-h-[44px] px-4 rounded-xl bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#170E2B] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] text-xs font-semibold text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC] hover:border-[#6366F1]/50 purple:hover:border-[#A855F7]/60 transition-colors"
            >
              {t.catalog.clearFilters}
            </button>
          )}
        </div>
      );
    }

    if (viewMode === 'grade') {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((jogo) => (
            <GridGameCard
              key={jogo.id}
              jogo={jogo}
              isFavorite={favorites.includes(String(jogo.id))}
              onToggleFavorite={toggleFavorite}
              onSelect={setSelectedGame}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((jogo) => (
          <ListGameCard
            key={jogo.id}
            jogo={jogo}
            isFavorite={favorites.includes(String(jogo.id))}
            onToggleFavorite={toggleFavorite}
            onSelect={setSelectedGame}
          />
        ))}
      </div>
    );
  };

  const renderSearchAndFilters = () => (
    <div className="space-y-4">
      {/* 1. Top Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.catalog.searchPlaceholder}
          aria-label={t.catalog.searchPlaceholder}
          className="w-full h-12 pl-12 pr-11 rounded-2xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] text-sm text-[#111827] dark:text-white placeholder-[#525866] dark:placeholder-[#9CA3AF] purple:placeholder-[#C4B5FD]/75 focus:outline-none focus:border-[#6366F1] purple:focus:border-[#C084FC] transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Limpar busca"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] hover:text-[#111827] dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  const renderFiltersSection = () => (
    <section ref={filterBarRef} className="space-y-2.5">
      <h2 className="text-base font-bold text-[#111827] dark:text-white">
        {t.catalog.filters}
      </h2>
      <div className="flex items-center gap-2.5 relative">
        {/* Categorias Dropdown */}
        <div className="relative flex-1 sm:flex-initial">
          <button
            type="button"
            onClick={() =>
              setOpenDropdown((prev) =>
                prev === 'categoria' ? null : 'categoria'
              )
            }
            aria-expanded={openDropdown === 'categoria'}
            className={`w-full sm:w-auto min-h-[44px] px-4 rounded-2xl border text-xs sm:text-sm font-medium flex items-center justify-between gap-2 transition-colors ${
              selectedCategory !== 'Todas'
                ? 'bg-[#6366F1]/12 dark:bg-[#6366F1]/15 purple:bg-[#9333EA]/25 border-[#6366F1]/60 purple:border-[#C084FC] text-[#4F46E5] dark:text-white'
                : 'bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] text-[#111827] dark:text-white hover:border-[#6366F1]/40 purple:hover:border-[#A855F7]/60'
            }`}
          >
            <span className="inline-flex items-center gap-2 truncate">
              <SlidersHorizontal className="w-4 h-4 text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC] shrink-0" />
              <span className="truncate">
                {selectedCategory === 'Todas'
                  ? t.catalog.categories
                  : selectedCategory}
              </span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] shrink-0 transition-transform ${
                openDropdown === 'categoria' ? 'rotate-180' : ''
              }`}
            />
          </button>

          {openDropdown === 'categoria' && (
            <div className="absolute left-0 mt-2 w-56 max-h-64 overflow-y-auto rounded-2xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] shadow-xl dark:shadow-2xl dark:shadow-black/60 z-30 p-1.5">
              {['Todas', ...uniqueCategories].map((cat) => {
                const isSelected = selectedCategory === cat;
                const displayLabel =
                  cat === 'Todas' ? t.catalog.allCategories : cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setOpenDropdown(null);
                    }}
                    className={`w-full min-h-[40px] px-3 rounded-xl text-left text-sm flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-[#6366F1]/15 dark:bg-[#6366F1]/20 purple:bg-[#9333EA]/25 text-[#4F46E5] dark:text-white font-semibold'
                        : 'text-[#374151] dark:text-[#D1D5DB] purple:text-[#DDD6FE] hover:bg-[#F4F5F9] dark:hover:bg-[#2A2738]/60 purple:hover:bg-[#170E2B]'
                    }`}
                  >
                    <span className="truncate">{displayLabel}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Ordenar Dropdown */}
        <div className="relative flex-1 sm:flex-initial">
          <button
            type="button"
            onClick={() =>
              setOpenDropdown((prev) => (prev === 'ordenar' ? null : 'ordenar'))
            }
            aria-expanded={openDropdown === 'ordenar'}
            className="w-full sm:w-auto min-h-[44px] px-4 rounded-2xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] hover:border-[#6366F1]/40 purple:hover:border-[#A855F7]/60 text-xs sm:text-sm font-medium text-[#111827] dark:text-white flex items-center justify-between gap-2 transition-colors"
          >
            <span className="inline-flex items-center gap-2 truncate">
              <ArrowDownUp className="w-4 h-4 text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC] shrink-0" />
              <span className="truncate">{sortLabels[sortOption]}</span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] shrink-0 transition-transform ${
                openDropdown === 'ordenar' ? 'rotate-180' : ''
              }`}
            />
          </button>

          {openDropdown === 'ordenar' && (
            <div className="absolute right-0 sm:left-0 mt-2 w-52 rounded-2xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] shadow-xl dark:shadow-2xl dark:shadow-black/60 z-30 p-1.5">
              {(Object.keys(sortLabels) as SortOption[]).map((opt) => {
                const isSelected = sortOption === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setSortOption(opt);
                      setOpenDropdown(null);
                    }}
                    className={`w-full min-h-[40px] px-3 rounded-xl text-left text-sm flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-[#6366F1]/15 dark:bg-[#6366F1]/20 purple:bg-[#9333EA]/25 text-[#4F46E5] dark:text-white font-semibold'
                        : 'text-[#374151] dark:text-[#D1D5DB] purple:text-[#DDD6FE] hover:bg-[#F4F5F9] dark:hover:bg-[#2A2738]/60 purple:hover:bg-[#170E2B]'
                    }`}
                  >
                    <span>{sortLabels[opt]}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );

  const renderViewToggle = () => (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466]">
      <button
        type="button"
        onClick={() => setViewMode('lista')}
        aria-label={t.catalog.listMode}
        title={t.catalog.listMode}
        className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-colors ${
          viewMode === 'lista'
            ? 'bg-[#6366F1] purple:bg-[#9333EA] text-white'
            : 'text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] hover:text-[#111827] dark:hover:text-white'
        }`}
      >
        <List className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => setViewMode('grade')}
        aria-label={t.catalog.gridMode}
        title={t.catalog.gridMode}
        className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-colors ${
          viewMode === 'grade'
            ? 'bg-[#6366F1] purple:bg-[#9333EA] text-white'
            : 'text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] hover:text-[#111827] dark:hover:text-white'
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F4F5F9] dark:bg-[#0F0E13] purple:bg-[#140C24] text-[#111827] dark:text-white pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 space-y-6">
        {/* Top Brand Row */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] purple:from-[#7E22CE] purple:to-[#C026D3] flex items-center justify-center shrink-0">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#111827] dark:text-white truncate">
              DroidPort Store
            </h1>
          </div>

          <button
            type="button"
            onClick={() => void fetchJogos()}
            aria-label={t.catalog.refreshCatalog}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] hover:text-[#111827] dark:hover:text-white hover:border-[#6366F1]/50 purple:hover:border-[#A855F7]/60 transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                loading ? 'animate-spin text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC]' : ''
              }`}
            />
          </button>
        </header>

        {/* Tab: Início */}
        {activeTab === 'inicio' && (
          <div className="space-y-6">
            {renderSearchAndFilters()}

            {/* 2. Seção Destaques (X) */}
            {(loading || featuredGames.length > 0) && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-bold text-[#111827] dark:text-white">
                    {t.catalog.featured} ({featuredGames.length})
                  </h2>
                </div>

                {loading ? (
                  <div className="flex gap-3.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="shrink-0 w-[82vw] max-w-[330px] sm:w-[340px] h-[210px] rounded-2xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-3.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
                    {featuredGames.map((jogo) => (
                      <FeaturedCard
                        key={jogo.id}
                        jogo={jogo}
                        isFavorite={favorites.includes(String(jogo.id))}
                        onToggleFavorite={toggleFavorite}
                        onSelect={setSelectedGame}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* 3. Seção Filtros */}
            {renderFiltersSection()}

            {/* 4. Seção Todos os jogos (X) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base sm:text-lg font-bold text-[#111827] dark:text-white">
                  {t.catalog.allGames} ({filteredGames.length})
                </h2>
                {renderViewToggle()}
              </div>

              {renderGameList(filteredGames, t.catalog.emptyFilter)}
            </section>
          </div>
        )}

        {/* Tab: Jogos (Catálogo Completo) */}
        {activeTab === 'jogos' && (
          <div className="space-y-6">
            {renderSearchAndFilters()}
            {renderFiltersSection()}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base sm:text-lg font-bold text-[#111827] dark:text-white">
                  {t.catalog.allGames} ({filteredGames.length})
                </h2>
                {renderViewToggle()}
              </div>

              {renderGameList(filteredGames, t.catalog.emptyCatalog)}
            </section>
          </div>
        )}

        {/* Tab: Favoritos */}
        {activeTab === 'favoritos' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base sm:text-lg font-bold text-[#111827] dark:text-white">
                {t.catalog.favorites} ({favoriteGames.length})
              </h2>
              {renderViewToggle()}
            </div>

            {renderGameList(favoriteGames, t.catalog.emptyFavorites)}
          </section>
        )}

        {/* Tab: Histórico */}
        {activeTab === 'historico' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base sm:text-lg font-bold text-[#111827] dark:text-white">
                {t.history.title} ({downloadList.length})
              </h2>

              {downloadList.length > 0 && (
                <button
                  type="button"
                  onClick={() => void handleClearCache()}
                  className="min-h-[40px] px-3 rounded-xl bg-white dark:bg-[#1B1924] purple:bg-[#20143A] border border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] hover:border-rose-500/40 text-xs font-semibold text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] hover:text-[#111827] dark:hover:text-white inline-flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t.history.clearHistory}</span>
                </button>
              )}
            </div>

            <ProgressView
              tasks={downloadList}
              onRetry={handleRetryDownload}
              onRemoveFinished={handleRemoveFinished}
            />
          </section>
        )}

        {/* Tab: Configurações */}
        {activeTab === 'configuracoes' && (
          <section className="space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-[#111827] dark:text-white">
              {t.settings.title}
            </h2>
            <SettingsView
              appVersion={APP_VERSION}
              favoritesCount={favorites.length}
              downloadsCount={downloadList.length}
              onCheckUpdatesNow={() => checkForUpdatesNow(true)}
              onClearCache={handleClearCache}
              onClearFavorites={handleClearFavorites}
            />
          </section>
        )}
      </div>

      {availableUpdate && (
        <UpdateModal
          update={availableUpdate}
          onUpdateNow={handleUpdateNow}
          onDismiss={() => setAvailableUpdate(null)}
        />
      )}

      {/* 5. Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Navegação principal"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1B1924]/95 purple:bg-[#20143A]/95 backdrop-blur-md border-t border-[#E2E4EC] dark:border-[#2A2738] purple:border-[#392466] pb-safe"
      >
        <div className="max-w-3xl mx-auto grid grid-cols-5 items-center h-16 px-1">
          {(
            [
              { id: 'inicio', label: t.nav.inicio, icon: Home },
              { id: 'jogos', label: t.nav.jogos, icon: Gamepad2 },
              { id: 'favoritos', label: t.nav.favoritos, icon: Heart },
              { id: 'historico', label: t.nav.historico, icon: History },
              { id: 'configuracoes', label: t.nav.configuracoes, icon: Settings },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-xl px-0.5 transition-colors ${
                  isActive
                    ? 'text-[#6366F1] dark:text-[#8B5CF6] purple:text-[#C084FC]'
                    : 'text-[#525866] dark:text-[#9CA3AF] purple:text-[#C4B5FD] hover:text-[#111827] dark:hover:text-white'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 ${
                      isActive && item.id === 'favoritos'
                        ? 'fill-[#6366F1] dark:fill-[#8B5CF6] purple:fill-[#C084FC]'
                        : ''
                    }`}
                  />
                </div>
                <span className="text-[10px] font-medium tracking-tight whitespace-nowrap truncate max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
