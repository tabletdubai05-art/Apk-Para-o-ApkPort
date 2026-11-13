import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  Download,
  Gamepad2,
  Heart,
  Home,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
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
import {
  cancelDownloadTask,
  restartCleanDownload,
  startHybridDownload,
} from './services/downloadEngine';
import type {
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
  extractFileNameFromUrl,
  parseCategories,
  parseSizeToBytes,
  sanitizeFolderName,
} from './utils/formatters';

export const VERSAO_APP = '1.0.4';

const SUPABASE_URL = 'https://mfwzkzywxvbbonsshjgh.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1md3prenl3eHZiYm9uc3NoamdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1MjIyMTgsImV4cCI6MjExMDA5ODIxOH0.GC7FJFhSVjKaKJsackBMjLXIf4eLUnY8H2J3kDBbi6M';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FAVORITES_STORAGE_KEY = 'droidport_favorites_v1';
const VIEW_MODE_STORAGE_KEY = 'droidport_view_mode_v1';

const SORT_LABELS: Record<SortOption, string> = {
  recentes: 'Mais Recentes',
  nome: 'Nome (A-Z)',
  tamanho: 'Tamanho',
};

export default function App() {
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

  // Check Supabase `config` table for app updates on startup
  useEffect(() => {
    let active = true;

    const checkUpdates = async () => {
      try {
        const { data, error: configError } = await supabase
          .from('config')
          .select('*')
          .limit(1);

        if (configError || !data || data.length === 0) return;

        const row = data[0] as {
          versao_atual?: string | number | null;
          link_apk?: string | null;
        };

        const versaoAtual =
          typeof row.versao_atual === 'string'
            ? row.versao_atual.trim()
            : row.versao_atual !== null && row.versao_atual !== undefined
            ? String(row.versao_atual).trim()
            : '';
        const linkApk =
          typeof row.link_apk === 'string' ? row.link_apk.trim() : '';

        if (!versaoAtual || versaoAtual === VERSAO_APP || !active) {
          return;
        }

        setAvailableUpdate({
          versaoAtual,
          linkApk,
        });
      } catch {
        // Silently ignore offline / query errors during update check
      }
    };

    void checkUpdates();
    return () => {
      active = false;
    };
  }, []);

  const handleUpdateNow = useCallback(() => {
    if (!availableUpdate) return;
    const linkApk = availableUpdate.linkApk;
    setAvailableUpdate(null);
    if (linkApk) {
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
        // Any download that was running before reload becomes resumable ('paused')
        const normalizedStatus =
          task.status === 'downloading' || task.status === 'starting'
            ? 'paused'
            : task.status;

        const updatedTask: DownloadTask = {
          ...task,
          status: normalizedStatus,
          speedBytesPerSec: 0,
          peers: 0,
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
        status: 'starting',
        mode: 'system-browser',
        progress: 0,
        downloadedBytes: 0,
        totalBytes: parseSizeToBytes(tamanho),
        speedBytesPerSec: 0,
        peers: 0,
        fileName,
        savedPath: undefined,
        errorMessage: undefined,
        updatedAt: Date.now() + index,
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

      setSelectedGame(null);
      setActiveTab('progresso');

      void restartCleanDownload(task, handleTaskUpdate);
    },
    [createFileTask, handleTaskUpdate]
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

      setSelectedGame(null);
      setActiveTab('progresso');

      for (const task of tasks) {
        void restartCleanDownload(task, handleTaskUpdate);
      }
    },
    [createFileTask, handleTaskUpdate]
  );

  const handleResumeDownload = useCallback(
    (task: DownloadTask) => {
      void startHybridDownload(task, handleTaskUpdate);
    },
    [handleTaskUpdate]
  );

  const handleRetryDownload = useCallback(
    (task: DownloadTask) => {
      void restartCleanDownload(task, handleTaskUpdate);
    },
    [handleTaskUpdate]
  );

  const handleCancelDownload = useCallback((taskId: string) => {
    void cancelDownloadTask(taskId, () => {
      setDownloads((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    });
  }, []);

  const handleRemoveFinished = useCallback((taskId: string) => {
    void deleteDownloadTask(taskId);
    setDownloads((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  }, []);

  const handleClearCache = useCallback(async () => {
    const allTasks = Object.values(downloads);
    for (const t of allTasks) {
      if (t.status === 'downloading' || t.status === 'starting') {
        await cancelDownloadTask(t.taskId);
      }
    }
    await clearAllDownloadCache();
    setDownloads({});
  }, [downloads]);

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

  const activeDownloadsCount = useMemo(() => {
    return downloadList.filter(
      (d) => d.status === 'starting' || d.status === 'downloading'
    ).length;
  }, [downloadList]);

  // Game Details View Overlay
  if (selectedGame) {
    const gameId = String(selectedGame.id);
    return (
      <>
        <GameDetailsView
          jogo={selectedGame}
          isFavorite={favorites.includes(gameId)}
          downloads={downloads}
          onBack={() => setSelectedGame(null)}
          onToggleFavorite={toggleFavorite}
          onStartFileDownload={handleStartFileDownload}
          onDownloadAll={handleDownloadAll}
          onCancelDownload={handleCancelDownload}
          onResumeDownload={handleResumeDownload}
          onRetryDownload={handleRetryDownload}
          onGoToProgress={() => {
            setSelectedGame(null);
            setActiveTab('progresso');
          }}
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
              className="h-28 rounded-2xl bg-[#1B1924] border border-[#2A2738] animate-pulse"
            />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-2xl bg-[#1B1924] border border-[#2A2738] p-6 text-center space-y-3">
          <p className="text-sm text-rose-400">{error}</p>
          <button
            type="button"
            onClick={() => void fetchJogos()}
            className="min-h-[44px] px-5 rounded-xl bg-[#6366F1] hover:bg-[#5558E6] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Recarregar catálogo</span>
          </button>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="rounded-2xl bg-[#1B1924] border border-[#2A2738] p-8 text-center space-y-2">
          <Gamepad2 className="w-8 h-8 text-[#6366F1]/70 mx-auto" />
          <p className="text-sm font-medium text-white">{emptyMessage}</p>
          {(searchQuery || selectedCategory !== 'Todas') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('Todas');
              }}
              className="mt-2 min-h-[44px] px-4 rounded-xl bg-[#0F0E13] border border-[#2A2738] text-xs font-semibold text-[#8B5CF6] hover:border-[#6366F1]/50 transition-colors"
            >
              Limpar filtros
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
        <Search className="w-5 h-5 text-[#9CA3AF] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Pesquisar jogos..."
          aria-label="Pesquisar jogos"
          className="w-full h-12 pl-12 pr-11 rounded-2xl bg-[#1B1924] border border-[#2A2738] text-sm text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#6366F1] transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Limpar busca"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-[#9CA3AF] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  const renderFiltersSection = () => (
    <section ref={filterBarRef} className="space-y-2.5">
      <h2 className="text-base font-bold text-white">Filtros</h2>
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
                ? 'bg-[#6366F1]/15 border-[#6366F1]/60 text-white'
                : 'bg-[#1B1924] border-[#2A2738] text-white hover:border-[#6366F1]/40'
            }`}
          >
            <span className="inline-flex items-center gap-2 truncate">
              <SlidersHorizontal className="w-4 h-4 text-[#8B5CF6] shrink-0" />
              <span className="truncate">
                {selectedCategory === 'Todas'
                  ? 'Categorias'
                  : selectedCategory}
              </span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-[#9CA3AF] shrink-0 transition-transform ${
                openDropdown === 'categoria' ? 'rotate-180' : ''
              }`}
            />
          </button>

          {openDropdown === 'categoria' && (
            <div className="absolute left-0 mt-2 w-56 max-h-64 overflow-y-auto rounded-2xl bg-[#1B1924] border border-[#2A2738] shadow-2xl shadow-black/60 z-30 p-1.5">
              {['Todas', ...uniqueCategories].map((cat) => {
                const isSelected = selectedCategory === cat;
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
                        ? 'bg-[#6366F1]/20 text-white font-semibold'
                        : 'text-[#D1D5DB] hover:bg-[#2A2738]/60'
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#8B5CF6] shrink-0" />}
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
            className="w-full sm:w-auto min-h-[44px] px-4 rounded-2xl bg-[#1B1924] border border-[#2A2738] hover:border-[#6366F1]/40 text-xs sm:text-sm font-medium text-white flex items-center justify-between gap-2 transition-colors"
          >
            <span className="inline-flex items-center gap-2 truncate">
              <ArrowDownUp className="w-4 h-4 text-[#8B5CF6] shrink-0" />
              <span className="truncate">{SORT_LABELS[sortOption]}</span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-[#9CA3AF] shrink-0 transition-transform ${
                openDropdown === 'ordenar' ? 'rotate-180' : ''
              }`}
            />
          </button>

          {openDropdown === 'ordenar' && (
            <div className="absolute right-0 sm:left-0 mt-2 w-52 rounded-2xl bg-[#1B1924] border border-[#2A2738] shadow-2xl shadow-black/60 z-30 p-1.5">
              {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => {
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
                        ? 'bg-[#6366F1]/20 text-white font-semibold'
                        : 'text-[#D1D5DB] hover:bg-[#2A2738]/60'
                    }`}
                  >
                    <span>{SORT_LABELS[opt]}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#8B5CF6] shrink-0" />}
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
    <div className="flex items-center gap-1 p-1 rounded-xl bg-[#1B1924] border border-[#2A2738]">
      <button
        type="button"
        onClick={() => setViewMode('lista')}
        aria-label="Modo Lista"
        title="Modo Lista"
        className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-colors ${
          viewMode === 'lista'
            ? 'bg-[#6366F1] text-white'
            : 'text-[#9CA3AF] hover:text-white'
        }`}
      >
        <List className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => setViewMode('grade')}
        aria-label="Modo Grade"
        title="Modo Grade"
        className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-colors ${
          viewMode === 'grade'
            ? 'bg-[#6366F1] text-white'
            : 'text-[#9CA3AF] hover:text-white'
        }`}
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F0E13] text-white pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 space-y-6">
        {/* Top Brand Row */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center shrink-0">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white truncate">
              DroidPort Store
            </h1>
          </div>

          <button
            type="button"
            onClick={() => void fetchJogos()}
            aria-label="Atualizar catálogo"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#1B1924] border border-[#2A2738] text-[#9CA3AF] hover:text-white hover:border-[#6366F1]/50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#8B5CF6]' : ''}`} />
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
                  <h2 className="text-base sm:text-lg font-bold text-white">
                    Destaques ({featuredGames.length})
                  </h2>
                </div>

                {loading ? (
                  <div className="flex gap-3.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="shrink-0 w-[82vw] max-w-[330px] sm:w-[340px] h-[210px] rounded-2xl bg-[#1B1924] border border-[#2A2738] animate-pulse"
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
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Todos os jogos ({filteredGames.length})
                </h2>
                {renderViewToggle()}
              </div>

              {renderGameList(
                filteredGames,
                'Nenhum jogo encontrado com os filtros atuais.'
              )}
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
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Todos os jogos ({filteredGames.length})
                </h2>
                {renderViewToggle()}
              </div>

              {renderGameList(
                filteredGames,
                'Nenhum jogo encontrado no catálogo.'
              )}
            </section>
          </div>
        )}

        {/* Tab: Favoritos */}
        {activeTab === 'favoritos' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base sm:text-lg font-bold text-white">
                Favoritos ({favoriteGames.length})
              </h2>
              {renderViewToggle()}
            </div>

            {renderGameList(
              favoriteGames,
              'Você ainda não favoritou nenhum jogo. Toque no coração de qualquer port para salvá-lo aqui.'
            )}
          </section>
        )}

        {/* Tab: Progresso */}
        {activeTab === 'progresso' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-white">
                Progresso ({downloadList.length})
              </h2>
            </div>

            <ProgressView
              tasks={downloadList}
              onCancel={handleCancelDownload}
              onResume={handleResumeDownload}
              onRetry={handleRetryDownload}
              onRemoveFinished={handleRemoveFinished}
            />
          </section>
        )}

        {/* Tab: Configurações */}
        {activeTab === 'configuracoes' && (
          <section className="space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-white">
              Configurações
            </h2>
            <SettingsView
              appVersion={VERSAO_APP}
              favoritesCount={favorites.length}
              downloadsCount={downloadList.length}
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
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#1B1924]/95 backdrop-blur-md border-t border-[#2A2738] pb-safe"
      >
        <div className="max-w-3xl mx-auto grid grid-cols-5 items-center h-16 px-1">
          {(
            [
              { id: 'inicio', label: 'Início', icon: Home },
              { id: 'jogos', label: 'Jogos', icon: Gamepad2 },
              { id: 'favoritos', label: 'Favoritos', icon: Heart },
              { id: 'progresso', label: 'Progresso', icon: Download },
              { id: 'configuracoes', label: 'Configurações', icon: Settings },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const showBadge = item.id === 'progresso' && activeDownloadsCount > 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-xl px-0.5 transition-colors ${
                  isActive
                    ? 'text-[#8B5CF6]'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 ${
                      isActive && item.id === 'favoritos' ? 'fill-[#8B5CF6]' : ''
                    }`}
                  />
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[#6366F1] text-white text-[10px] font-bold font-mono-nums flex items-center justify-center">
                      {activeDownloadsCount}
                    </span>
                  )}
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
